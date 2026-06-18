export type TransportType = "walking" | "public_transport" | "car";

export type CompanionType =
  | "solo"
  | "couple"
  | "friends"
  | "family"
  | "other";

export type WeatherType =
  | "sunny"
  | "cloudy"
  | "rainy"
  | "snowy"
  | "mixed"
  | "unknown";

export type Post = {
  id: string;
  user_id: string;
  title: string;
  route_date?: string | null;
  area?: string | null;
  transport_type?: TransportType | string | null;
  companion_type?: CompanionType | string | null;
  budget?: number | null;
  weather_type?: WeatherType | string | null;
  caption?: string | null;
  cover_image_url?: string | null;
  type?: string | null;
  is_published?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ScheduleItem = {
  id: string;
  post_id: string;
  start_time?: string | null;
  end_time?: string | null;
  content_name?: string | null;
  place_name?: string | null;
  time?: string | null;
  stay_duration?: number | string | null;
  spot_name?: string | null;
  comment?: string | null;
  image_url?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PostFormState = {
  title: string;
  routeDate: string;
  area: string;
  transportType: TransportType | "";
  companionType: CompanionType | "";
  budget: string;
  weatherType: WeatherType | "";
  thumbnailUrl: string;
  caption: string;
  isPublished: boolean;
  scheduleItems: ScheduleItemFormState[];
};

export type ScheduleItemFormState = {
  id?: string;
  startTime: string;
  endTime: string;
  contentName: string;
  placeName: string;
  comment: string;
  imageUrl: string;
  sortOrder: number;
};
