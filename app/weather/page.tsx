'use client'
// app/weather/page.tsx — JARVIS Weather Full Dashboard
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

interface WeatherData {
  city:string; temp:number; feels:number; humidity:number; wind:number
  desc:string; icon:string; uv:number; visibility:number; pressure:number
  sunrise:string; sunset:string
  hourly:{time:string;temp:number;icon:string;rain:number}[]
  daily:{day:string;high:number;low:number;icon:string;rain:number}[]
  aqi:number; aqiLevel:string; aqiColor:string
}

const WX_ICONS: Record<string,string> = {
  '0':'☀️','1':'🌤','2':'⛅','3':'☁️','45':'🌫','48':'🌫',
  '51':'🌦','53':'🌦','55':'🌧','61':'🌧','63':'🌧','65':'🌧',
  '71':'❄️','73':'❄️','75':'❄️','80':'🌦','81':'🌧','82':'⛈',
  '85':'❄️','86':'❄️','95':'⛈','96':'⛈','99':'⛈'
}
const wxIcon = (code:number) => WX_ICONS[String(code)] || WX_ICONS[String(Math.floor(code/10)*10)] || '🌡️'
const wxDesc = (code:number):string => {
  if(code===0) return 'Clear sky'
  if(code<=3) return 'Partly cloudy'
  if(code<=48) return 'Foggy'
  if(code<=65) return 'Rainy'
  if(code<=75) return 'Snowy'
  if(code<=82) return 'Showers'
  if(code>=95) return 'Thunderstorm'
  return 'Cloudy'
}
const aqiInfo = (aqi:number) => {
  if(aqi<=50) return {level:'Good',color:'#22c55e'}
  if(aqi<=100) return {level:'Moderate',color:'#f59e0b'}
  if(aqi<=150) return {level:'Unhealthy (Sensitive)',color:'#f97316'}
  if(aqi<=200) return {level:'Unhealthy',color:'#ef4444'}
  return {level:'Very Unhealthy',color:'#a855f7'}
}

export default function WeatherPage() {
  const router = useRouter()
  const [data, setData] = useState<WeatherData|null>(null)
  const [loading, setLoading] = useState(true)
  const [locInput, setLocInput] = useState('')
  const [manualLat, setManualLat] = useState<number|null>(null)
  const [manualLon, setManualLon] = useState<number|null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    initTheme()
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => loadWeather(p.coords.latitude, p.coords.longitude),
        () => loadWeather(24.535, 80.834, 'Rewa, MP') // Default Rewa
      )
    } else {
      loadWeather(24.535, 80.834, 'Rewa, MP')
    }
  }, [])

  const searchLocation = async () => {
    if(!locInput.trim()) return
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locInput)}&format=json&limit=1`)
      const d = await r.json()
      if(d[0]) { loadWeather(Number(d[0].lat), Number(d[0].lon), d[0].display_name.split(',')[0]) }
      else setError('Location nahi mili')
    } catch { setError('Search failed') }
  }

  const loadWeather = async (lat:number, lon:number, cityOverride?:string) => {
    setLoading(true); setError('')
    try {
      const [weatherR, aqiR, geoR] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,uv_index,visibility,surface_pressure&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max&timezone=Asia%2FKolkata&forecast_days=7`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=Asia%2FKolkata`).catch(()=>null),
        cityOverride ? null : fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
      ])
      const w = await weatherR.json()
      const aq = aqiR?.ok ? await aqiR.json() : null
      const geo = geoR ? (await geoR.json()) : null

      const city = cityOverride || geo?.address?.city || geo?.address?.town || geo?.address?.village || 'Your Location'
      const aqi = aq?.current?.us_aqi || 0
      const aqData = aqiInfo(aqi)

      const now = new Date()
      const hourNow = now.getHours()
      const hourly = w.hourly.time.slice(hourNow, hourNow+12).map((t:string,i:number)=>({
        time: new Date(t).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}),
        temp: Math.round(w.hourly.temperature_2m[hourNow+i]),
        icon: wxIcon(w.hourly.weather_code[hourNow+i]),
        rain: w.hourly.precipitation_probability[hourNow+i]||0
      }))
      const daily = w.daily.time.map((t:string,i:number)=>({
        day: i===0?'Today':i===1?'Tomorrow':new Date(t).toLocaleDateString('en-IN',{weekday:'short'}),
        high: Math.round(w.daily.temperature_2m_max[i]),
        low: Math.round(w.daily.temperature_2m_min[i]),
        icon: wxIcon(w.daily.weather_code[i]),
        rain: w.daily.precipitation_probability_max[i]||0
      }))

      setData({
        city, temp:Math.round(w.current.temperature_2m), feels:Math.round(w.current.apparent_temperature),
        humidity:w.current.relative_humidity_2m, wind:Math.round(w.current.wind_speed_10m),
        desc:wxDesc(w.current.weather_code), icon:wxIcon(w.current.weather_code),
        uv:Math.round(w.current.uv_index||w.daily.uv_index_max[0]||0),
        visibility:Math.round((w.current.visibility||10000)/1000),
        pressure:Math.round(w.current.surface_pressure),
        sunrise:new Date(w.daily.sunrise[0]).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}),
        sunset:new Date(w.daily.sunset[0]).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}),
        hourly, daily, aqi, aqiLevel:aqData.level, aqiColor:aqData.color
      })
    } catch(e) { setError('Weather load nahi hui. Internet check karo.') }
    setLoading(false)
  }

  const card = (title:string, val:string, sub?:string, color?:string) => (
    <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 10px',flex:1}}>
      <div style={{fontSize:10,color:'var(--text-3)',marginBottom:2}}>{title}</div>
      <div style={{fontSize:16,fontWeight:700,color:color||'var(--text)',fontFamily:"'JetBrains Mono',monospace"}}>{val}</div>
      {sub&&<div style={{fontSize:9,color:'var(--text-4)',marginTop:2}}>{sub}</div>}
    </div>
  )

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1,fontSize:15,fontWeight:700}}>🌤️ Weather</div>
      </div>

      {/* Search */}
      <div style={{padding:'10px 14px',display:'flex',gap:8}}>
        <input value={locInput} onChange={e=>setLocInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchLocation()} placeholder="📍 City search karo..." style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 12px',color:'var(--text)',fontSize:13}}/>
        <button onClick={searchLocation} style={{padding:'9px 14px',background:'var(--accent)',color:'#000',border:'none',borderRadius:10,fontWeight:700,fontSize:12,cursor:'pointer'}}>Go</button>
        <button onClick={()=>navigator.geolocation.getCurrentPosition(p=>loadWeather(p.coords.latitude,p.coords.longitude))} style={{padding:'9px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,fontSize:16,cursor:'pointer'}}>📍</button>
      </div>
      {error&&<div style={{padding:'0 14px 8px',fontSize:12,color:'#ef4444'}}>{error}</div>}

      {loading&&<div style={{textAlign:'center',padding:'60px 0',fontSize:14,color:'var(--text-3)'}}>🌤️ Loading weather...</div>}

      {data&&!loading&&(
        <div style={{padding:'0 14px 80px'}}>
          {/* Hero */}
          <div style={{textAlign:'center',padding:'20px 0 16px'}}>
            <div style={{fontSize:12,color:'var(--text-3)',marginBottom:4}}>📍 {data.city}</div>
            <div style={{fontSize:80,lineHeight:1,marginBottom:4}}>{data.icon}</div>
            <div style={{fontSize:56,fontWeight:900,color:'var(--accent)',fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{data.temp}°</div>
            <div style={{fontSize:13,color:'var(--text-2)',marginTop:6}}>{data.desc} · Feels {data.feels}°</div>
          </div>

          {/* Stats grid */}
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {card('💧 Humidity',`${data.humidity}%`,'Relative')}
            {card('💨 Wind',`${data.wind} km/h`,'Speed')}
            {card('☀️ UV',`${data.uv}`,data.uv<3?'Low':data.uv<6?'Moderate':'High',data.uv<3?'#22c55e':data.uv<6?'#f59e0b':'#ef4444')}
          </div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {card('👁️ Visibility',`${data.visibility} km`)}
            {card('🌅 Sunrise',data.sunrise)}
            {card('🌇 Sunset',data.sunset)}
          </div>

          {/* AQI */}
          <div style={{background:`${data.aqiColor}11`,border:`1px solid ${data.aqiColor}33`,borderRadius:12,padding:'12px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'var(--text-3)',marginBottom:2}}>🌬️ Air Quality Index</div>
              <div style={{fontSize:18,fontWeight:800,color:data.aqiColor,fontFamily:"'JetBrains Mono',monospace"}}>{data.aqi} — {data.aqiLevel}</div>
            </div>
            <div style={{width:50,height:50,borderRadius:'50%',background:`${data.aqiColor}22`,border:`3px solid ${data.aqiColor}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:data.aqiColor}}>{data.aqi}</div>
          </div>

          {/* Hourly */}
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'12px',marginBottom:12}}>
            <div style={{fontSize:11,color:'var(--text-3)',marginBottom:10,fontWeight:600}}>HOURLY FORECAST</div>
            <div style={{display:'flex',gap:10,overflowX:'auto'}} className="no-scroll">
              {data.hourly.map((h,i)=>(
                <div key={i} style={{flexShrink:0,textAlign:'center',minWidth:48}}>
                  <div style={{fontSize:9,color:'var(--text-3)',marginBottom:3}}>{h.time}</div>
                  <div style={{fontSize:20,marginBottom:3}}>{h.icon}</div>
                  <div style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{h.temp}°</div>
                  {h.rain>0&&<div style={{fontSize:9,color:'#60a5fa',marginTop:2}}>💧{h.rain}%</div>}
                </div>
              ))}
            </div>
          </div>

          {/* 7-day */}
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'12px'}}>
            <div style={{fontSize:11,color:'var(--text-3)',marginBottom:10,fontWeight:600}}>7-DAY FORECAST</div>
            {data.daily.map((d,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',padding:'8px 0',borderBottom:i<data.daily.length-1?'1px solid var(--border)':'none'}}>
                <div style={{fontSize:12,color:i===0?'var(--accent)':'var(--text-2)',fontWeight:i===0?700:400,width:80,flexShrink:0}}>{d.day}</div>
                <div style={{fontSize:20,width:36,flexShrink:0}}>{d.icon}</div>
                {d.rain>0&&<div style={{fontSize:10,color:'#60a5fa',flex:1}}>💧{d.rain}%</div>}
                <div style={{textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>
                  <span style={{fontSize:13,fontWeight:700}}>{d.high}°</span>
                  <span style={{fontSize:11,color:'var(--text-3)',marginLeft:4}}>{d.low}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
