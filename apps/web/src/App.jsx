import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Leer código del tag desde la URL: /tag/ABC123
function getTagCode() {
  const match = window.location.pathname.match(/^\/tag\/(.+)$/);
  return match ? match[1].toUpperCase() : null;
}

export default function App() {
  const code = getTagCode();

  if (!code) return <Home />;
  return <TagPage code={code} />;
}

function Home() {
  return (
    <main style={s.container}>
      <div style={s.card}>
        <div style={s.logo}>🐾 ChipDog</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
          Tenencia responsable
        </h1>
        <p style={{ color: '#6b7280', fontSize: 15 }}>
          Escanea el tag de tu mascota para ver su información.
        </p>
      </div>
    </main>
  );
}

function TagPage({ code }) {
  const [pet, setPet] = useState(undefined); // undefined = cargando

  useEffect(() => {
    supabase
      .rpc('get_pet_public_by_tag', { p_code: code })
      .then(({ data }) => setPet(data?.[0] ?? null));
  }, [code]);

  if (pet === undefined) return <Loading />;
  if (!pet) return <NotFound code={code} />;
  return <PetCard pet={pet} />;
}

function Loading() {
  return (
    <main style={s.container}>
      <div style={s.card}>
        <div style={s.logo}>🐾 ChipDog</div>
        <p style={{ color: '#6b7280' }}>Buscando mascota...</p>
      </div>
    </main>
  );
}

function NotFound({ code }) {
  return (
    <main style={s.container}>
      <div style={s.card}>
        <div style={s.logo}>🐾 ChipDog</div>
        <h2 style={{ fontSize: 20, color: '#111827', marginBottom: 10 }}>Tag no encontrado</h2>
        <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.5 }}>
          El código <strong>{code}</strong> no está registrado o no tiene una mascota vinculada.
        </p>
      </div>
    </main>
  );
}

function PetCard({ pet }) {
  const waText = encodeURIComponent(`Hola, encontré a ${pet.public_name} 🐾`);
  const waNumber = pet.contact_whatsapp?.replace(/\D/g, '');

  return (
    <main style={s.container}>
      <div style={s.card}>
        <div style={s.logo}>🐾 ChipDog</div>

        {pet.is_lost && (
          <div style={s.lostBanner}>⚠️ Esta mascota está reportada como PERDIDA</div>
        )}

        {pet.photo_url && (
          <img src={pet.photo_url} alt={pet.public_name} style={s.photo} />
        )}

        <h1 style={s.petName}>{pet.public_name}</h1>

        <div style={s.infoGrid}>
          {pet.species    && <Row label="Especie" value={pet.species} />}
          {pet.breed      && <Row label="Raza"    value={pet.breed} />}
          {pet.color      && <Row label="Color"   value={pet.color} />}
          {pet.owner_name && <Row label="Dueño"   value={pet.owner_name} />}
        </div>

        {pet.public_notes && (
          <div style={s.notesBox}>
            <p style={s.notesLabel}>Indicaciones importantes</p>
            <p style={s.notesText}>{pet.public_notes}</p>
          </div>
        )}

        <div style={s.actions}>
          {pet.contact_phone && (
            <a href={`tel:${pet.contact_phone}`} style={{ ...s.btn, ...s.btnCall }}>
              📞 Llamar al dueño
            </a>
          )}
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...s.btn, ...s.btnWhatsapp }}
            >
              💬 WhatsApp
            </a>
          )}
        </div>

        <p style={s.footer}>Información gestionada por ChipDog</p>
      </div>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={s.rowValue}>{value}</span>
    </div>
  );
}

const s = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e8f4f8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '32px 28px',
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
    textAlign: 'center',
  },
  logo: { fontSize: 22, fontWeight: 700, color: '#2563eb', marginBottom: 20 },
  lostBanner: {
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 20,
    fontSize: 14,
    fontWeight: 600,
    color: '#92400e',
  },
  photo: {
    width: 120, height: 120, borderRadius: 60,
    objectFit: 'cover', border: '3px solid #e5e7eb', marginBottom: 16,
  },
  petName: { fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 20px' },
  infoGrid: {
    background: '#f9fafb', borderRadius: 12,
    padding: '12px 16px', marginBottom: 16, textAlign: 'left',
  },
  row: {
    display: 'flex', justifyContent: 'space-between',
    padding: '6px 0', borderBottom: '1px solid #e5e7eb',
  },
  rowLabel: { fontSize: 13, color: '#6b7280', fontWeight: 500 },
  rowValue: { fontSize: 13, color: '#111827', fontWeight: 600 },
  notesBox: {
    background: '#eff6ff', border: '1px solid #bfdbfe',
    borderRadius: 10, padding: '12px 14px', marginBottom: 20, textAlign: 'left',
  },
  notesLabel: {
    fontSize: 12, fontWeight: 700, color: '#2563eb',
    margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  notesText: { fontSize: 14, color: '#1e40af', margin: 0, lineHeight: 1.5 },
  actions: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  btn: {
    display: 'block', padding: 14, borderRadius: 12,
    textDecoration: 'none', fontSize: 15, fontWeight: 700,
  },
  btnCall:     { background: '#2563eb', color: '#fff' },
  btnWhatsapp: { background: '#16a34a', color: '#fff' },
  footer: { fontSize: 12, color: '#9ca3af', margin: 0 },
};
