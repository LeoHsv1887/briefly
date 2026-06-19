import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEFAULT_LAT = 51.9427
const DEFAULT_LON = 7.9827
const DEFAULT_CITY = 'Warendorf'

function getWeatherInfo(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: 'sun', label: 'Sonnig' }
  if (code <= 2) return { icon: 'cloud-sun', label: 'Leicht bewölkt' }
  if (code === 3) return { icon: 'cloud', label: 'Bewölkt' }
  if (code <= 49) return { icon: 'cloud-fog', label: 'Neblig' }
  if (code <= 59) return { icon: 'cloud-drizzle', label: 'Nieselregen' }
  if (code <= 69) return { icon: 'cloud-rain', label: 'Regen' }
  if (code <= 79) return { icon: 'snowflake', label: 'Schnee' }
  if (code <= 84) return { icon: 'cloud-storm', label: 'Gewitter' }
  return { icon: 'cloud', label: 'Wechselhaft' }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const latParam = searchParams.get('lat')
  const lonParam = searchParams.get('lon')
  const useCustom = latParam && lonParam
  const lat = useCustom ? latParam : DEFAULT_LAT
  const lon = useCustom ? lonParam : DEFAULT_LON

  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,apparent_temperature&timezone=Europe%2FBerlin`,
      { next: { revalidate: 1800 } }
    )
    const weatherData = await weatherRes.json()

    let city = DEFAULT_CITY
    if (useCustom) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=de`,
          { headers: { 'User-Agent': 'Briefly App' }, next: { revalidate: 3600 } }
        )
        const geoData = await geoRes.json()
        city =
          geoData.address?.city ||
          geoData.address?.town ||
          geoData.address?.village ||
          geoData.address?.suburb ||
          'Dein Standort'
      } catch {}
    }

    const temp = Math.round(weatherData.current?.temperature_2m ?? 0)
    const feelsLike = Math.round(weatherData.current?.apparent_temperature ?? 0)
    const code = weatherData.current?.weather_code ?? 0
    const { icon, label } = getWeatherInfo(code)

    return NextResponse.json({ city, temp, feelsLike, icon, label, weatherCode: code })
  } catch (err) {
    console.error('Weather fetch error:', err)
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 500 })
  }
}
