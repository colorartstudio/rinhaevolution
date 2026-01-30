const SUPABASE_URL = 'https://rkkyffxxbxqhweperfyj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJra3lmZnh4YnhxaHdlcGVyZnlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc5MzEyMiwiZXhwIjoyMDg1MzY5MTIyfQ.LvgCoe15-N_LeRclHor_3T7U1BsqzpvB2JavZq5LIZs';

async function verifySetup() {
    console.log("--- VERIFICANDO CONEXÃO SUPABASE ---");
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=count`, {
            headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Range': '0-0',
                'Prefer': 'count=exact, head=true'
            }
        });

        if (response.status === 404) {
             console.error("❌ ERRO: Tabelas não encontradas (404).");
             console.log("\n👉 AÇÃO NECESSÁRIA:");
             console.log("Copie o conteúdo de 'supabase_schema.sql' e execute no SQL Editor do Supabase.");
        } else if (response.ok) {
            console.log("✅ CONEXÃO ESTABELECIDA!");
            console.log("✅ Banco de dados pronto para uso.");
        } else {
            const err = await response.json();
            console.error("❌ Erro:", err.message || response.statusText);
        }
    } catch (err) {
        console.error("❌ Erro de rede:", err.message);
    }
}

verifySetup();
