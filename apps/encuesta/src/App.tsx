import { useState, useRef, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from './supabase-client'

// Tipos
type Survey = {
  id: string
  vehicleId: string
  vehiclePlate: string
  overallRating: number
  cleanlinessRating: number
  driverAttention: number
  punctuality: number
  comfort: number
  wouldRecommend: string
  comments: string
  name: string
  email: string
  companyName: string
  fecha: string
  fechaLocal: string
}

// Mapper de Supabase a TypeScript Survey
const mapFromSupabase = (s: any): Survey => ({
  id: s.id,
  vehicleId: s.vehicle_id || '',
  vehiclePlate: s.vehicle_plate || '',
  overallRating: s.overall_rating || 0,
  cleanlinessRating: s.cleanliness_rating || 0,
  driverAttention: s.driver_attention || 0,
  punctuality: s.punctuality || 0,
  comfort: s.comfort || 0,
  wouldRecommend: s.would_recommend || '',
  comments: s.comments || '',
  name: s.name || '',
  email: s.email || '',
  companyName: s.company_name || 'TRANS SERVICES A&B',
  fecha: s.fecha || '',
  fechaLocal: s.fecha_local || ''
})


function App() {
  const getInitialMode = (): 'admin' | 'form' | 'reports' => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('mode') === 'form') return 'form'
    if (urlParams.get('mode') === 'reports') return 'reports'
    return 'admin'
  }
  
  const [mode, setMode] = useState<'admin' | 'form' | 'reports'>(getInitialMode)
  const [companyName, setCompanyName] = useState('TRANS SERVICES A&B')
  const [showInstructions, setShowInstructions] = useState(true)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  
  // Datos de encuestas
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loadingSurveys, setLoadingSurveys] = useState(false)
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month

  // Preparar conexión
  useEffect(() => {
    setIsAuthReady(true)
  }, [])

  // Cargar encuestas cuando entra a modo reportes
  useEffect(() => {
    if (mode === 'reports' && isAuthReady) {
      loadSurveys()
    }
  }, [mode, isAuthReady, dateFilter])

  const loadSurveys = async () => {
    setLoadingSurveys(true)
    try {
    const { data: supabaseData, error } = await supabase
      .from('operacion.encuestas')
      .select('*')
      .order('created_at', { ascending: false })
      
      if (error) throw error
      
      let data = (supabaseData || []).map(mapFromSupabase)
      
      // Filtrar por fecha
      const today = new Date().toISOString().split('T')[0]
      if (dateFilter === 'today') {
        data = data.filter(s => s.fechaLocal === today)
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        data = data.filter(s => s.fechaLocal >= weekAgo)
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        data = data.filter(s => s.fechaLocal >= monthAgo)
      }
      
      setSurveys(data)
    } catch (error) {
      console.error('Error cargando encuestas:', error)
    } finally {
      setLoadingSurveys(false)
    }
  }

  // Eliminar encuesta
  const deleteSurvey = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta encuesta?')) return
    try {
      const { error } = await supabase
        .from('operacion.encuestas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      setSurveys(surveys.filter(s => s.id !== id))
    } catch (error) {
      console.error('Error eliminando encuesta:', error)
      alert('Error al eliminar la encuesta')
    }
  }

  // Calcular promedios
  const averages = surveys.length > 0 ? {
    overall: (surveys.reduce((acc, s) => acc + (s.overallRating || 0), 0) / surveys.length).toFixed(1),
    cleanliness: (surveys.reduce((acc, s) => acc + (s.cleanlinessRating || 0), 0) / surveys.length).toFixed(1),
    driver: (surveys.reduce((acc, s) => acc + (s.driverAttention || 0), 0) / surveys.length).toFixed(1),
    punctuality: (surveys.reduce((acc, s) => acc + (s.punctuality || 0), 0) / surveys.length).toFixed(1),
    comfort: (surveys.reduce((acc, s) => acc + (s.comfort || 0), 0) / surveys.length).toFixed(1),
  } : null

  // Exportar a CSV
  const exportCSV = () => {
    const headers = ['Fecha', 'Placa', 'ID Vehiculo', 'Calificacion General', 'Limpieza', 'Conductor', 'Puntualidad', 'Comodidad', 'Recomendaria', 'Comentarios', 'Nombre', 'Email']
    const rows = surveys.map(s => [
      s.fechaLocal,
      s.vehiclePlate,
      s.vehicleId,
      s.overallRating,
      s.cleanlinessRating,
      s.driverAttention,
      s.punctuality,
      s.comfort,
      s.wouldRecommend,
      s.comments,
      s.name,
      s.email
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `encuestas-${new Date().toISOString().split('T')[0]}.csv`
    link.href = url
    link.click()
  }

  const [surveyData, setSurveyData] = useState({
    vehicleId: '',
    vehiclePlate: '',
    overallRating: 0,
    cleanlinessRating: 0,
    driverAttention: 0,
    punctuality: 0,
    comfort: 0,
    wouldRecommend: '',
    comments: '',
    name: '',
    email: '',
  })

  const [submitted, setSubmitted] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const handleDownloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) {
      alert('Error: No se pudo generar el QR')
      return
    }
    
    try {
      const finalCanvas = document.createElement('canvas')
      const ctx = finalCanvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo obtener contexto 2D')
      
      const width = 400
      const height = 480
      finalCanvas.width = width
      finalCanvas.height = height
      
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      
      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 28px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(companyName, width / 2, 50)
      
      ctx.font = '18px system-ui, sans-serif'
      ctx.fillStyle = '#4b5563'
      ctx.fillText('Califica nuestro servicio', width / 2, 85)
      
      const qrSize = 200
      const qrX = (width - qrSize) / 2
      const qrY = 120
      ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize)
      
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 2
      ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20)
      
      ctx.fillStyle = '#6b7280'
      ctx.font = '14px system-ui, sans-serif'
      ctx.fillText('Escanea con tu celular', width / 2, qrY + qrSize + 45)
      ctx.fillStyle = '#9ca3af'
      ctx.font = '12px system-ui, sans-serif'
      ctx.fillText('⭐ Tu opinión nos importa ⭐', width / 2, qrY + qrSize + 70)
      
      const link = document.createElement('a')
      link.download = `QR-${companyName.replace(/\s+/g, '-')}-Encuesta.png`
      link.href = finalCanvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al generar la imagen')
    }
  }

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!surveyData.vehiclePlate.trim() && !surveyData.vehicleId.trim()) {
      alert('Por favor ingresa la placa o ID del vehículo')
      return
    }
    
    try {
      const docData = {
        vehicle_id: surveyData.vehicleId,
        vehicle_plate: surveyData.vehiclePlate,
        overall_rating: surveyData.overallRating,
        cleanliness_rating: surveyData.cleanlinessRating,
        driver_attention: surveyData.driverAttention,
        punctuality: surveyData.punctuality,
        comfort: surveyData.comfort,
        would_recommend: surveyData.wouldRecommend,
        comments: surveyData.comments,
        name: surveyData.name,
        email: surveyData.email,
        company_name: companyName,
        fecha_local: new Date().toISOString().split('T')[0]
      }
      
      const { error } = await supabase
        .from('operacion.encuestas')
        .insert(docData)
      
      if (error) throw error
      setSubmitted(true)
    } catch (error: any) {
      alert(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  const StarRating = ({ rating, onRatingChange, label }: { rating: number, onRatingChange: (rating: number) => void, label: string }) => (
    <div className="mb-5">
      <label className="block text-gray-700 font-medium mb-2 text-sm">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`text-2xl transition-all duration-200 hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          >★</button>
        ))}
      </div>
    </div>
  )

  const StarDisplay = ({ rating }: { rating: number }) => (
    <span className="text-yellow-400">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
  )

  // MODO REPORTES
  if (mode === 'reports') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">📊 Reporte de Encuestas</h1>
                <p className="text-blue-100">{surveys.length} encuestas recibidas</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMode('admin')} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition text-sm">← Volver al Admin</button>
                <button onClick={exportCSV} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg transition text-sm">📥 Exportar CSV</button>
              </div>
            </div>
          </div>

          {/* Promedios */}
          {averages && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-md text-center">
                <p className="text-xs text-gray-500 mb-1">General</p>
                <p className="text-2xl font-bold text-blue-600">{averages.overall}</p>
                <div className="text-yellow-400 text-sm">{'★'.repeat(Math.round(parseFloat(averages.overall)))}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-md text-center">
                <p className="text-xs text-gray-500 mb-1">Limpieza</p>
                <p className="text-2xl font-bold text-blue-600">{averages.cleanliness}</p>
                <div className="text-yellow-400 text-sm">{'★'.repeat(Math.round(parseFloat(averages.cleanliness)))}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-md text-center">
                <p className="text-xs text-gray-500 mb-1">Conductor</p>
                <p className="text-2xl font-bold text-blue-600">{averages.driver}</p>
                <div className="text-yellow-400 text-sm">{'★'.repeat(Math.round(parseFloat(averages.driver)))}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-md text-center">
                <p className="text-xs text-gray-500 mb-1">Puntualidad</p>
                <p className="text-2xl font-bold text-blue-600">{averages.punctuality}</p>
                <div className="text-yellow-400 text-sm">{'★'.repeat(Math.round(parseFloat(averages.punctuality)))}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-md text-center">
                <p className="text-xs text-gray-500 mb-1">Comodidad</p>
                <p className="text-2xl font-bold text-blue-600">{averages.comfort}</p>
                <div className="text-yellow-400 text-sm">{'★'.repeat(Math.round(parseFloat(averages.comfort)))}</div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white rounded-xl p-4 shadow-md mb-6">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setDateFilter('all')} className={`px-4 py-2 rounded-lg transition ${dateFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Todas</button>
              <button onClick={() => setDateFilter('today')} className={`px-4 py-2 rounded-lg transition ${dateFilter === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Hoy</button>
              <button onClick={() => setDateFilter('week')} className={`px-4 py-2 rounded-lg transition ${dateFilter === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Última semana</button>
              <button onClick={() => setDateFilter('month')} className={`px-4 py-2 rounded-lg transition ${dateFilter === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Último mes</button>
            </div>
          </div>

          {/* Lista de encuestas */}
          {loadingSurveys ? (
            <div className="text-center py-12 text-gray-500">Cargando encuestas...</div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-gray-500">No hay encuestas{dateFilter !== 'all' ? ' para este período' : ''}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {surveys.map((survey) => (
                <div key={survey.id} className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-lg">🚗 {survey.vehiclePlate || 'Sin placa'} {survey.vehicleId && `(${survey.vehicleId})`}</p>
                      <p className="text-sm text-gray-500">{survey.fechaLocal} • {survey.name || 'Anónimo'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{survey.overallRating}/5</p>
                      <StarDisplay rating={survey.overallRating} />
                      <button onClick={() => deleteSurvey(survey.id)} className="text-red-400 hover:text-red-600 text-sm mt-2">🗑️ Eliminar</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-sm">
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">Limpieza:</span> <StarDisplay rating={survey.cleanlinessRating} /></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">Conductor:</span> <StarDisplay rating={survey.driverAttention} /></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">Puntualidad:</span> <StarDisplay rating={survey.punctuality} /></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">Comodidad:</span> <StarDisplay rating={survey.comfort} /></div>
                  </div>
                  
                  {survey.wouldRecommend && (
                    <p className="mt-3 text-sm"><span className="text-gray-500">¿Recomendaría?</span> <span className="font-medium">{survey.wouldRecommend}</span></p>
                  )}
                  
                  {survey.comments && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded italic">"{survey.comments}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // MODO ADMIN
  if (mode === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">🚗 QR para Encuesta</h1>
            <p className="text-blue-200">Un solo código para toda tu flota</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Nombre de la Empresa</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Transportes García"
              />
            </div>

            <div ref={qrRef} className="flex flex-col items-center p-6 bg-gray-50 rounded-xl mb-6">
              <h3 className="text-xl font-bold text-gray-800 text-center mb-1">{companyName}</h3>
              <p className="text-sm text-gray-500 mb-4">Califica nuestro servicio</p>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <QRCodeCanvas
                  value={`${window.location.origin}${window.location.pathname}?mode=form`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <p className="text-xs text-gray-400 mt-3">Escanea para evaluar ⭐</p>
            </div>

            <button onClick={handleDownloadQR} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition flex items-center justify-center gap-2">
              📥 Descargar QR para Imprimir
            </button>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => setMode('form')} className="text-gray-500 hover:text-gray-700 text-sm underline py-2">Ver formulario</button>
              <button onClick={() => setMode('reports')} className="text-blue-600 hover:text-blue-800 text-sm underline py-2 font-medium">📊 Ver Reportes</button>
            </div>
          </div>

          {showInstructions && (
            <div className="mt-6 bg-white/10 backdrop-blur rounded-2xl p-6 text-white">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">📋 Instrucciones</h3>
                <button onClick={() => setShowInstructions(false)} className="text-blue-200 hover:text-white">✕</button>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-blue-100">
                <li>Descarga el QR (es único, sirve para todos los vehículos)</li>
                <li>Imprime y coloca el QR en cada vehículo</li>
                <li>Los clientes escanean y completan el formulario</li>
                <li>El cliente ingresa la placa/vehículo en el formulario</li>
                <li>Revisa los reportes en "Ver Reportes"</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    )
  }

  // VISTA CONFIRMACIÓN
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">¡Gracias por tu opinión!</h2>
          <p className="text-gray-600 mb-6">Tu feedback nos ayuda a mejorar.</p>
          <button
            onClick={() => {
              setSubmitted(false)
              setSurveyData({
                vehicleId: '', vehiclePlate: '', overallRating: 0, cleanlinessRating: 0,
                driverAttention: 0, punctuality: 0, comfort: 0, wouldRecommend: '',
                comments: '', name: '', email: '',
              })
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition"
          >Enviar otra encuesta</button>
        </div>
      </div>
    )
  }

  // MODO FORMULARIO CLIENTE
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-6 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-2xl p-5 text-white text-center">
          <div className="text-3xl mb-1">🚗</div>
          <h1 className="text-xl font-bold">Encuesta de Satisfacción</h1>
          <p className="text-blue-100 text-sm">{companyName}</p>
        </div>

        <form onSubmit={handleSurveySubmit} className="bg-white rounded-b-2xl shadow-xl p-5">
          <div className="bg-blue-50 rounded-xl p-4 mb-5 border border-blue-100">
            <p className="text-blue-800 font-medium mb-3 text-sm">🚙 Datos del vehículo</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={surveyData.vehiclePlate}
                onChange={(e) => setSurveyData({...surveyData, vehiclePlate: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Placa ej: ABC123"
              />
              <input
                type="text"
                value={surveyData.vehicleId}
                onChange={(e) => setSurveyData({...surveyData, vehicleId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="ID interno (opcional)"
              />
            </div>
          </div>

          <StarRating rating={surveyData.overallRating} onRatingChange={(r) => setSurveyData({...surveyData, overallRating: r})} label="Experiencia general" />
          <StarRating rating={surveyData.cleanlinessRating} onRatingChange={(r) => setSurveyData({...surveyData, cleanlinessRating: r})} label="Limpieza del vehículo" />
          <StarRating rating={surveyData.driverAttention} onRatingChange={(r) => setSurveyData({...surveyData, driverAttention: r})} label="Atención del conductor" />
          <StarRating rating={surveyData.punctuality} onRatingChange={(r) => setSurveyData({...surveyData, punctuality: r})} label="Puntualidad" />
          <StarRating rating={surveyData.comfort} onRatingChange={(r) => setSurveyData({...surveyData, comfort: r})} label="Comodidad" />

          <div className="mb-5">
            <label className="block text-gray-700 font-medium mb-2 text-sm">¿Recomendarías el servicio?</label>
            <div className="flex gap-2">
              {['Sí', 'Tal vez', 'No'].map((option) => (
                <label key={option} className={`flex-1 cursor-pointer border-2 rounded-lg p-3 text-center transition-all ${surveyData.wouldRecommend === option ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="recommend" value={option} checked={surveyData.wouldRecommend === option} onChange={(e) => setSurveyData({...surveyData, wouldRecommend: e.target.value})} className="sr-only" />
                  <span className="text-xl block">{option === 'Sí' ? '👍' : option === 'Tal vez' ? '🤔' : '👎'}</span>
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <textarea value={surveyData.comments} onChange={(e) => setSurveyData({...surveyData, comments: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Comentarios adicionales (opcional)..." />
          </div>

          <div className="bg-gray-50 rounded-xl p-3 mb-5">
            <p className="text-xs text-gray-500 mb-2">📧 Contacto (opcional)</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={surveyData.name} onChange={(e) => setSurveyData({...surveyData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Nombre" />
              <input type="email" value={surveyData.email} onChange={(e) => setSurveyData({...surveyData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Email" />
            </div>
          </div>

          <button type="submit" disabled={surveyData.overallRating === 0 || !isAuthReady} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-xl transition disabled:shadow-none shadow-lg">
            {isAuthReady ? 'Enviar Encuesta' : 'Cargando...'}
          </button>

          {authError && <p className="text-center text-red-500 text-xs mt-2">⚠️ {authError}</p>}
          {surveyData.overallRating === 0 && <p className="text-center text-gray-400 text-xs mt-2">Selecciona una calificación para continuar</p>}
        </form>

        <p className="text-center text-gray-400 text-xs mt-4">🔒 Tus datos están protegidos</p>
      </div>
    </div>
  )
}

export default App
