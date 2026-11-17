import { Link } from 'react-router-dom';

const PLANS = [
  { name: 'Aliado', price: 100, items: ['Una ubicación', 'Ficha y QR', 'Una oferta activa', 'Validación de visitas', 'Reporte básico'] },
  { name: 'Impulso', price: 300, featured: true, items: ['Una ubicación', 'Hasta tres campañas', 'Reportes por campaña', 'Todo lo de Aliado'] },
  { name: 'Red', price: 900, items: ['Hasta cinco ubicaciones', 'Reporte consolidado', 'Todo lo de Impulso'] },
];

export function Landing() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="eyebrow">El Salvador · rutas con beneficios</div>
            <h1>Cada visita, un sello. Cada ruta, una recompensa.</h1>
            <p>
              Pasaporte Guanaco conecta a viajeros con comercios locales: descubren rutas, sellan su pasaporte digital al
              visitar y desbloquean beneficios verificados por el propio comercio.
            </p>
            <div className="row" style={{ marginTop: 24 }}>
              <Link to="/login" className="btn btn-gold btn-lg">Acceso comercios</Link>
              <a href="#como-funciona" className="btn btn-ghost btn-lg" style={{ color: '#fff', borderColor: '#3b5a66' }}>
                Cómo funciona
              </a>
            </div>
          </div>
          <div className="passport-art" aria-hidden>
            <div className="row spread">
              <strong>PASAPORTE</strong>
              <span className="badge badge-demo">DEMO</span>
            </div>
            <div className="small" style={{ opacity: 0.7 }}>Ruta de las Flores</div>
            <div className="stamp-grid">
              <div className="stamp">Café<br />Volcán</div>
              <div className="stamp gold">Hostal<br />Horizonte</div>
              <div className="stamp">Taller<br />Añil</div>
              <div className="stamp empty">?</div>
              <div className="stamp empty">?</div>
              <div className="stamp empty">?</div>
            </div>
            <div className="alert alert-ok" style={{ marginTop: 16 }}>¡3 sellos! Café de altura gratis desbloqueado</div>
          </div>
        </div>
      </section>

      <section className="section" id="como-funciona">
        <h2>Cómo funciona</h2>
        <div className="grid grid-4 steps" style={{ marginTop: 16 }}>
          <div className="card"><h3>Explora</h3><p className="muted">El viajero elige una ruta corta con comercios participantes.</p></div>
          <div className="card"><h3>Escanea</h3><p className="muted">Escanea el QR del local y solicita su sello.</p></div>
          <div className="card"><h3>Valida</h3><p className="muted">El personal aprueba la visita desde este panel. Un QR fotografiado no basta.</p></div>
          <div className="card"><h3>Canjea</h3><p className="muted">Al completar metas recibe un cupón con cupo limitado y de un solo uso.</p></div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <h2>Planes para comercios</h2>
        <p className="muted">Precios de trabajo, anuales por ubicación, antes de impuestos. La demo no procesa pagos.</p>
        <div className="grid grid-3" style={{ marginTop: 16 }}>
          {PLANS.map((p) => (
            <div key={p.name} className={`card plan ${p.featured ? 'featured' : ''}`}>
              <h3>{p.name}</h3>
              <div className="price">${p.price}<small> /año</small></div>
              <ul>
                {p.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Patrocinio de rutas</h3>
          <p className="muted">
            Ruta piloto de 90 días desde $1,500 · temporada de seis meses desde $3,000 · programa anual según alcance.
            Incluye presencia de marca y reporte de métricas agregadas.
          </p>
        </div>
      </section>

      <footer>
        Pasaporte Guanaco · demo v0.1.0 · Todos los comercios mostrados son ficticios y se identifican como DEMO.
      </footer>
    </>
  );
}
