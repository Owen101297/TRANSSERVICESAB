async function run() {
  const url = "https://xftllyjjqvozjjmgwomg.supabase.co/rest/v1/asistencia?select=*&order=fecha.desc&limit=10";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdGxseWpqcXZvempqbWd3b21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjExMTIsImV4cCI6MjA5Mzc5NzExMn0.UURzZOytfoYMrxzpohRams_GcJ3ETsEnNNOaSQqeuu8";
  
  const res = await fetch(url, {
    headers: { "apikey": key, "Authorization": `Bearer ${key}` }
  });
  const data = await res.json();
  console.log("Últimos registros en Supabase:");
  data.forEach((item: any, i: number) => {
    console.log(`[${i}] Fecha: ${item.fecha} | Conductor: ${item.conductor_nombre} | Obs:`, item.observaciones ? item.observaciones.slice(0, 100) : "null");
  });
}
run();
