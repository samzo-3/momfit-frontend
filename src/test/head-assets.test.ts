import indexHtml from '../../index.html?raw'
import manifestJson from '../../public/site.webmanifest?raw'

// public 폴더의 파일 목록. 키는 "/public/favicon.ico" 형태다.
const publicFiles = new Set(
  Object.keys(import.meta.glob('/public/*', { eager: false })).map((path) =>
    path.replace('/public', ''),
  ),
)

// index.html의 <link>에서 href를 모은다.
function linkHrefs(rel: string): string[] {
  return [...indexHtml.matchAll(/<link\s+[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => new RegExp(`rel="${rel}"`).test(tag))
    .map((tag) => /href="([^"]+)"/.exec(tag)?.[1] ?? '')
}

describe('index.html 아이콘 설정', () => {
  it('파비콘과 애플 터치 아이콘, 매니페스트를 선언한다', () => {
    expect(linkHrefs('icon')).toEqual([
      '/favicon.ico',
      '/favicon-32x32.png',
      '/favicon-16x16.png',
    ])
    expect(linkHrefs('apple-touch-icon')).toEqual(['/apple-touch-icon.png'])
    expect(linkHrefs('manifest')).toEqual(['/site.webmanifest'])
  })

  it('선언한 파일이 모두 public에 실제로 있다', () => {
    const hrefs = [
      ...linkHrefs('icon'),
      ...linkHrefs('apple-touch-icon'),
      ...linkHrefs('manifest'),
    ]

    for (const href of hrefs) {
      expect(publicFiles, `${href} 파일이 없습니다`).toContain(href)
    }
  })

  it('Vite 템플릿의 기본 파비콘(favicon.svg)을 더 이상 쓰지 않는다', () => {
    expect(indexHtml).not.toContain('favicon.svg')
    expect(publicFiles).not.toContain('/favicon.svg')
  })
})

describe('site.webmanifest', () => {
  const manifest = JSON.parse(manifestJson) as {
    name: string
    short_name: string
    icons: { src: string; sizes: string; type: string }[]
  }

  it('서비스 이름과 아이콘 크기를 정의한다', () => {
    expect(manifest.name).toBe('MomFit')
    expect(manifest.short_name).toBe('MomFit')
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual([
      '192x192',
      '512x512',
    ])
  })

  it('매니페스트의 아이콘 파일이 모두 public에 있다', () => {
    for (const icon of manifest.icons) {
      expect(publicFiles, `${icon.src} 파일이 없습니다`).toContain(icon.src)
      expect(icon.type).toBe('image/png')
    }
  })
})
