export type ScheduleItem = {
  time: string;
  spotName: string;
  stay: string;
  comment: string;
  photo: string;
};

export type RoutyPost = {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  status: "予定" | "実績";
  saved: boolean;
  schedule: ScheduleItem[];
};

export type DetailScheduleItem = {
  contentName?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  comment?: string;
  time: string;
  place: string;
  category: string;
  duration: string;
  travelTimeToNext?: string;
};

export type RoutyPostDetail = RoutyPost & {
  userName: string;
  userAvatar: string;
  caption: string;
  hashtags: string[];
  postedAt: string;
  plannedSchedule: DetailScheduleItem[];
  actualSchedule: DetailScheduleItem[];
};

export const posts: RoutyPost[] = [
  {
    id: "kamakura-morning",
    title: "鎌倉、朝から海まで歩く半日ルート",
    author: "Yuki",
    coverImage:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80",
    status: "実績",
    saved: true,
    schedule: [
      {
        time: "09:00",
        spotName: "鎌倉駅",
        stay: "15分",
        comment: "駅前でコーヒーを買って出発。朝は人が少なく歩きやすい。",
        photo:
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=900&q=80",
      },
      {
        time: "09:30",
        spotName: "鶴岡八幡宮",
        stay: "45分",
        comment: "参道をゆっくり歩くとちょうどいいペース。",
        photo:
          "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=900&q=80",
      },
      {
        time: "11:00",
        spotName: "由比ヶ浜",
        stay: "60分",
        comment: "海沿いで軽く休憩。風が強い日は上着があると安心。",
        photo:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: "yanaka-cafe",
    title: "谷中で雑貨と喫茶をめぐる午後",
    author: "Mina",
    coverImage:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    status: "予定",
    saved: false,
    schedule: [
      {
        time: "13:00",
        spotName: "日暮里駅",
        stay: "10分",
        comment: "西口から谷中銀座方面へ。坂道が多いので歩きやすい靴で。",
        photo:
          "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=900&q=80",
      },
      {
        time: "13:20",
        spotName: "谷中銀座",
        stay: "70分",
        comment: "小さな店を見ながら食べ歩き。混む前の早め午後がよさそう。",
        photo:
          "https://images.unsplash.com/photo-1554797589-7241bb691973?auto=format&fit=crop&w=900&q=80",
      },
      {
        time: "15:00",
        spotName: "古民家カフェ",
        stay: "90分",
        comment: "最後は喫茶で休憩。席数が少ないので待ち時間込みで考える。",
        photo:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: "kyoto-riverside",
    title: "京都、川沿いで静かに過ごす夜",
    author: "Sota",
    coverImage:
      "https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?auto=format&fit=crop&w=1200&q=80",
    status: "実績",
    saved: true,
    schedule: [
      {
        time: "17:30",
        spotName: "祇園四条駅",
        stay: "10分",
        comment: "夕方の時間帯に集合。川沿いまで歩く。",
        photo:
          "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=900&q=80",
      },
      {
        time: "18:00",
        spotName: "鴨川",
        stay: "80分",
        comment: "日が落ちる前後が一番きれい。軽食を買っておくと便利。",
        photo:
          "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: "kobe-lunch",
    title: "神戸でパンと港を楽しむランチ散歩",
    author: "Nao",
    coverImage:
      "https://images.unsplash.com/photo-1512692723619-8b3e68365c9c?auto=format&fit=crop&w=1200&q=80",
    status: "予定",
    saved: false,
    schedule: [
      {
        time: "11:30",
        spotName: "三宮駅",
        stay: "10分",
        comment: "駅周辺で集合してベーカリー方面へ歩く。",
        photo:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
      },
      {
        time: "13:00",
        spotName: "メリケンパーク",
        stay: "60分",
        comment: "海沿いで食後の散歩。写真も撮りやすい。",
        photo:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: "hakone-onsen",
    title: "箱根で日帰り温泉と甘いもの",
    author: "Rina",
    coverImage:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    status: "実績",
    saved: true,
    schedule: [
      {
        time: "10:00",
        spotName: "箱根湯本駅",
        stay: "20分",
        comment: "駅前でお土産を先に見ると帰りが楽。",
        photo:
          "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=900&q=80",
      },
      {
        time: "12:00",
        spotName: "日帰り温泉",
        stay: "120分",
        comment: "昼の時間帯は比較的落ち着いていた。",
        photo:
          "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: "yokohama-night",
    title: "横浜、夜景までのゆるい半日",
    author: "Kei",
    coverImage:
      "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?auto=format&fit=crop&w=1200&q=80",
    status: "予定",
    saved: false,
    schedule: [
      {
        time: "15:00",
        spotName: "馬車道",
        stay: "45分",
        comment: "カフェに寄りながら赤レンガ方面へ。",
        photo:
          "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80",
      },
      {
        time: "18:00",
        spotName: "大さん橋",
        stay: "70分",
        comment: "日没前に着くと空の色が変わるところまで見られる。",
        photo:
          "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
];

export function getPost(id: string) {
  return posts.find((post) => post.id === id) ?? posts[0];
}

const categories = ["カフェ", "観光", "グルメ", "ショッピング", "散歩"];

function toDetailSchedule(
  schedule: ScheduleItem[],
  variant: "planned" | "actual",
): DetailScheduleItem[] {
  return schedule.map((item, index) => ({
    time:
      variant === "actual" && index === 1
        ? item.time.replace(":00", ":10").replace(":30", ":40")
        : item.time,
    place: item.spotName,
    category: categories[index % categories.length],
    duration: variant === "actual" && index === 0 ? `${item.stay}程度` : item.stay,
    travelTimeToNext:
      index < schedule.length - 1
        ? index % 2 === 0
          ? "徒歩5分"
          : "電車12分"
        : undefined,
  }));
}

export function getPostDetail(id: string): RoutyPostDetail {
  const post = getPost(id);

  return {
    ...post,
    userName: post.author,
    userAvatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
      post.author,
    )}`,
    caption:
      "半日でも無理なく回れるように、移動少なめで組んだルートです。写真を撮りながらゆっくり歩く日にちょうどいい内容にしました。",
    hashtags: ["#週末旅", "#カフェ巡り", "#散歩", "#ROUTY"],
    postedAt: "2日前",
    plannedSchedule: toDetailSchedule(post.schedule, "planned"),
    actualSchedule: toDetailSchedule(post.schedule, "actual"),
  };
}

export const myPosts = posts.slice(0, 2);
export const savedPosts = posts.filter((post) => post.saved);
