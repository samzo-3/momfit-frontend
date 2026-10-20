import { Link } from 'react-router-dom'
import Carousel from '../../../shared/components/Carousel'
import meditationImage from '../assets/hero-meditation.png'
import stretchWarmImage from '../assets/hero-stretch-warm.png'
import stretchWindowImage from '../assets/hero-stretch-window.png'

interface HomeHeroProps {
  nickname: string
  pregnancyWeek: number | null
  // 운동을 고르는 화면
  workoutsPath: string
}

interface SlideContent {
  id: string
  // 제목 위의 작은 알약 라벨
  tag: string
  title: string
  body: string
  cta: string
  image: string
  imageAlt: string
}

const AUTO_PLAY_MS = 6000

// 링크 끝의 화살표. 가리키면 살짝 오른쪽으로 움직인다.
function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  )
}

// 라벨 앞의 반짝이는 별 (이모지는 기기마다 모양이 달라 아이콘으로 그린다)
function SparkleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3 shrink-0"
      fill="currentColor"
    >
      <path d="M8 0c.5 3.6 1.6 5.7 3.1 6.9C12.4 7.8 14 8.1 16 8c-3.6.5-5.7 1.6-6.9 3.1C8.2 12.4 7.9 14 8 16c-.5-3.6-1.6-5.7-3.1-6.9C3.6 8.2 2 7.9 0 8c3.6-.5 5.7-1.6 6.9-3.1C7.8 3.6 8.1 2 8 0Z" />
    </svg>
  )
}

function slidesFor(
  nickname: string,
  pregnancyWeek: number | null,
): SlideContent[] {
  return [
    {
      id: 'move',
      tag: '작은 움직임부터',
      title: '오늘은 어떻게\n움직이고 싶나요?',
      body: '내 몸의 속도에 맞춰 움직여 보세요.\n무리하지 않아도 괜찮아요.',
      cta: '나에게 맞는 운동 살펴보기',
      image: stretchWarmImage,
      imageAlt: '거실 매트 위에서 몸을 풀고 있는 임산부',
    },
    {
      id: 'week',
      tag: '오늘의 컨디션',
      // 주차를 모르면 이름만으로 인사한다.
      title:
        pregnancyWeek === null
          ? `${nickname}님,\n오늘도 편안하게 시작해요`
          : `${nickname}님,\n임신 ${pregnancyWeek}주차예요`,
      body: '이 시기에 맞는 부드러운 움직임을\n찾아볼까요?',
      cta: '운동 시작하기',
      image: stretchWindowImage,
      imageAlt: '창가에서 옆구리를 늘리는 스트레칭을 하는 임산부',
    },
    {
      id: 'breath',
      tag: '나를 위한 시간',
      title: '호흡만 가다듬어도\n충분해요',
      body: '몸이 무거운 날에는\n쉬어 가는 운동부터 골라 보세요.',
      cta: '운동 시작하기',
      image: meditationImage,
      imageAlt: '소파에서 눈을 감고 호흡하는 임산부',
    },
  ]
}

// /home 첫 화면. 살구색 카드에 문구와 사진을 담은 슬라이드를 자동으로 넘기고,
// 모든 슬라이드의 버튼은 운동을 고르는 화면으로 이어진다.
function HomeHero({ nickname, pregnancyWeek, workoutsPath }: HomeHeroProps) {
  const slides = slidesFor(nickname, pregnancyWeek).map((slide) => ({
    id: slide.id,
    content: (
      <div className="grid items-center gap-8 rounded-3xl bg-primary p-6 sm:p-8 lg:min-h-96 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:p-10">
        <div className="flex flex-col items-start gap-5 lg:h-full lg:justify-between">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold tracking-wide text-brand">
            <SparkleIcon />
            {slide.tag}
          </p>
          <div className="flex flex-col gap-4">
            <h2 className="text-4xl leading-tight font-semibold whitespace-pre-line text-cocoa sm:text-5xl">
              {slide.title}
            </h2>
            <p className="text-[17px] whitespace-pre-line text-cocoa-secondary">
              {slide.body}
            </p>
          </div>
          {/* 버튼 대신 밑줄 링크. 카드의 문구와 사진이 주인공이 되도록 조용하게 둔다. */}
          <Link
            to={workoutsPath}
            className="group inline-flex items-center gap-2 border-b-[1.5px] border-brand-text py-1.5 text-[17px] font-medium text-brand-text transition-colors hover:border-cocoa hover:text-cocoa"
          >
            {slide.cta}
            <ArrowIcon />
          </Link>
        </div>
        <img
          src={slide.image}
          alt={slide.imageAlt}
          className="aspect-3/2 w-full rounded-2xl object-cover"
        />
      </div>
    ),
  }))

  return (
    <Carousel label="오늘의 추천" slides={slides} autoPlayMs={AUTO_PLAY_MS} />
  )
}

export default HomeHero
