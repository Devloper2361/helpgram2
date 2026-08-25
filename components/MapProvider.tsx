import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export function MapProvider({ children }: { children: React.ReactNode }) {
  if (!hasValidKey) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',minHeight:'300px',fontFamily:'sans-serif', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '2rem'}}>
        <div style={{textAlign:'center',maxWidth:520}}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Google Maps API Key Required</h2>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Step 1:</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener" style={{ color: '#2563eb' }}>Get an API Key</a></p>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Step 2:</strong> Add your key as a secret in AI Studio:</p>
          <ul style={{textAlign:'left',lineHeight:'1.8', fontSize: '0.875rem', backgroundColor: '#fff', padding: '1rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0'}}>
            <li>Open <strong>Settings</strong> (⚙️ gear icon, <strong>top-right corner</strong>)</li>
            <li>Select <strong>Secrets</strong></li>
            <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the secret name, press <strong>Enter</strong></li>
            <li>Paste your API key as the value, press <strong>Enter</strong></li>
          </ul>
          <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: '#64748b' }}>The app rebuilds automatically after you add the secret.</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      {children}
    </APIProvider>
  );
}
