import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "./supabase";

/* ─── Tokens (mesma paleta) ─── */
const T = {
  teal:    "#0D7491",
  green:   "#14A273",
  coral:   "#FF6B5E",
  bg:      "#F5F8FB",
  surface: "#FFFFFF",
  border:  "#E8EEF3",
  ink:     "#0E1A24",
  text:    "#2E3D4B",
  muted:   "#5A6B7A",
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
};

/* ─── CPF utils ─── */
const cleanCpf = (raw) => {
  if (!raw) return null;
  const v = String(raw).replace(/\D/g, "");
  if (v.length !== 11) return null;
  if (/^(\d)\1{10}$/.test(v)) return null;
  return v;
};
const formatCpf = (v) => {
  const c = (v || "").replace(/\D/g, "").slice(0, 11);
  if (c.length <= 3)  return c;
  if (c.length <= 6)  return `${c.slice(0,3)}.${c.slice(3)}`;
  if (c.length <= 9)  return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6)}`;
  return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9)}`;
};
const validCpf = (v) => {
  const c = cleanCpf(v);
  if (!c) return false;
  let d1 = 0, d2 = 0;
  for (let i = 0; i < 9; i++) d1 += parseInt(c[i]) * (10 - i);
  d1 = 11 - (d1 % 11); if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(c[9])) return false;
  for (let i = 0; i < 10; i++) d2 += parseInt(c[i]) * (11 - i);
  d2 = 11 - (d2 % 11); if (d2 >= 10) d2 = 0;
  return d2 === parseInt(c[10]);
};

const formatPhone = (v) => {
  const c = (v || "").replace(/\D/g, "").slice(0, 11);
  if (c.length <= 2)  return c;
  if (c.length <= 6)  return `(${c.slice(0,2)}) ${c.slice(2)}`;
  if (c.length <= 10) return `(${c.slice(0,2)}) ${c.slice(2,6)}-${c.slice(6)}`;
  return `(${c.slice(0,2)}) ${c.slice(2,7)}-${c.slice(7)}`;
};

export default function VantariPublicForm() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const fetchForm = useCallback(async () => {
    setLoading(true);
    // Forms novos (com scoring) vivem em mkt.forms; os legados das LPs ainda
    // em public.forms. Tenta mkt primeiro, cai pro public — ponte até o builder
    // do /landing convergir. _src guia a submissão pra tabela certa.
    let { data, error } = await supabase
      .schema("mkt").from("forms").select("*")
      .eq("slug", slug).eq("active", true).maybeSingle();
    let src = "mkt";
    if (!error && !data) {
      const r = await supabase
        .from("forms").select("*")
        .eq("slug", slug).eq("active", true).maybeSingle();
      data = r.data; error = r.error; src = "public";
    }
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (!data) { setError("Formulário não encontrado."); return; }
    setForm({ ...data, _src: src });
  }, [slug]);

  useEffect(() => { fetchForm(); }, [fetchForm]);

  const setField = (id, value) => {
    setValues(v => ({ ...v, [id]: value }));
    if (errors[id]) setErrors(e => ({ ...e, [id]: null }));
  };

  const validate = () => {
    const errs = {};
    (form.fields || []).forEach(f => {
      const v = values[f.id];
      if (f.required && (!v || (typeof v === "string" && !v.trim()))) {
        errs[f.id] = "Campo obrigatório";
        return;
      }
      if (!v) return;
      if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errs[f.id] = "Email inválido";
      if (f.type === "cpf"   && !validCpf(v))                              errs[f.id] = "CPF inválido";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError(null);

    // Monta payload: identidade (cpf/phone/email/name) no topo; campos com
    // scoring_key vão sob payload.attributes (envelope canônico do motor 0007).
    const payload = {};
    const attributes = {};
    (form.fields || []).forEach(f => {
      let v = values[f.id];
      if (v === undefined || v === null || v === "") return;
      if (f.type === "cpf")   v = cleanCpf(v);
      if (f.type === "phone") v = String(v).replace(/\D/g, "");
      if (f.scoring_key) attributes[f.scoring_key] = v;
      else               payload[f.id] = v;
    });
    if (Object.keys(attributes).length) payload.attributes = attributes;

    // UTMs a partir da URL (querystring)
    const utm_source   = searchParams.get("utm_source");
    const utm_medium   = searchParams.get("utm_medium");
    const utm_campaign = searchParams.get("utm_campaign");
    const utm_content  = searchParams.get("utm_content");
    const utm_term     = searchParams.get("utm_term");

    let error;
    if (form._src === "mkt") {
      // form novo → mkt.form_submissions (dispara on_form_submission + scoring)
      ({ error } = await supabase.schema("mkt").from("form_submissions").insert({
        workspace_id: form.workspace_id,
        form_id: form.id,
        payload,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      }));
    } else {
      // form legado → public.form_submissions (trigger legado)
      ({ error } = await supabase.from("form_submissions").insert({
        form_id: form.id,
        payload,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        referrer: typeof document !== "undefined" ? document.referrer : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      }));
    }

    setSubmitting(false);
    if (error) { setError(error.message); return; }
    if (form.redirect_url) { window.location.href = form.redirect_url; return; }
    setDone(true);
  };

  if (loading) return <Centered>Carregando…</Centered>;
  if (error && !form) return <Centered tone="error">{error}</Centered>;
  if (done) return (
    <Centered tone="success">
      <div style={{ fontFamily: T.head, fontSize: 22, fontWeight: 700, color: T.green, marginBottom: 8 }}>✓ Pronto!</div>
      <div style={{ fontFamily: T.font, fontSize: 14, color: T.text }}>{form.success_message || form.success_msg || "Recebemos seus dados."}</div>
    </Centered>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "32px 16px", fontFamily: T.font, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
      `}</style>
      <div style={{
        background: T.surface, borderRadius: 14, padding: "28px 28px 24px",
        width: "100%", maxWidth: 480,
        boxShadow: "0 1px 0 rgba(14,26,36,.04), 0 16px 36px -16px rgba(14,26,36,.15)",
        border: `1px solid ${T.border}`,
      }}>
        <h1 style={{ fontFamily: T.head, fontSize: 22, fontWeight: 700, color: T.ink, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          {form.name}
        </h1>
        {form.description && (
          <p style={{ fontSize: 13, color: T.muted, margin: "0 0 18px", fontWeight: 500 }}>{form.description}</p>
        )}

        {(form.fields || []).map(f => (
          <FieldRow key={f.id} field={f} value={values[f.id] || ""} error={errors[f.id]} onChange={(v) => setField(f.id, v)} />
        ))}

        {error && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: `${T.coral}14`, border: `1px solid ${T.coral}`, borderRadius: 8, color: T.coral, fontSize: 12, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={submitting} style={{
          marginTop: 20, width: "100%", padding: "11px 18px", border: "none", borderRadius: 10,
          background: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)", color: "#fff",
          fontSize: 14, fontWeight: 700, fontFamily: T.font, cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.6 : 1, transition: "all .15s",
        }}>
          {submitting ? "Enviando…" : "Enviar"}
        </button>

        <div style={{ marginTop: 16, fontSize: 10, color: T.muted, textAlign: "center", fontWeight: 600 }}>
          powered by <strong style={{ color: T.teal }}>Vantari</strong>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ field, value, error, onChange }) {
  const baseStyle = {
    width: "100%", padding: "9px 12px", border: `1px solid ${error ? T.coral : T.border}`,
    borderRadius: 8, fontSize: 13, color: T.text, fontFamily: T.font, outline: "none",
    background: T.surface,
  };

  let input;
  if (field.type === "textarea") {
    input = <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} rows={3} style={{ ...baseStyle, resize: "vertical" }} />;
  } else if (field.type === "select") {
    input = (
      <select value={value} onChange={e => onChange(e.target.value)} style={baseStyle}>
        <option value="">— selecione —</option>
        {(field.options || []).map(o => {
          const val = typeof o === "object" && o !== null ? o.value : o;
          const lab = typeof o === "object" && o !== null ? o.label : o;
          return <option key={val} value={val}>{lab}</option>;
        })}
      </select>
    );
  } else if (field.type === "checkbox") {
    input = (
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text, fontWeight: 500, cursor: "pointer" }}>
        <input type="checkbox" checked={value === true || value === "true"} onChange={e => onChange(e.target.checked)} />
        {field.placeholder || field.label}
      </label>
    );
  } else if (field.type === "cpf") {
    input = <input type="text" value={formatCpf(value)} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "000.000.000-00"} maxLength={14} style={baseStyle} inputMode="numeric" />;
  } else if (field.type === "phone") {
    input = <input type="tel" value={formatPhone(value)} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "(11) 99999-9999"} maxLength={16} style={baseStyle} inputMode="numeric" />;
  } else {
    input = <input type={field.type || "text"} value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} style={baseStyle} />;
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {field.type !== "checkbox" && (
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>
          {field.label} {field.required && <span style={{ color: T.coral }}>*</span>}
        </label>
      )}
      {input}
      {error && <div style={{ fontSize: 11, color: T.coral, marginTop: 4, fontWeight: 600 }}>{error}</div>}
    </div>
  );
}

function Centered({ children, tone }) {
  const color = tone === "error" ? "#FF6B5E" : tone === "success" ? "#14A273" : "#5A6B7A";
  return (
    <div style={{ minHeight: "100vh", background: "#F5F8FB", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: T.font }}>
      <div style={{ background: "#fff", padding: "28px 32px", borderRadius: 14, border: `1px solid #E8EEF3`, color, textAlign: "center", maxWidth: 420 }}>
        {children}
      </div>
    </div>
  );
}
