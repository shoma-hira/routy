export type TransportType = "walking" | "public_transport" | "car";

export const defaultTransportType: TransportType = "public_transport";

export const transportThemes: Record<
  TransportType,
  {
    label: string;
    detailLabel: string;
    description: string;
    textClass: string;
    borderClass: string;
    backgroundClass: string;
    lineClass: string;
    nodeClass: string;
  }
> = {
  walking: {
    label: "徒歩中心",
    detailLabel: "徒歩中心",
    description: "駅から徒歩中心",
    textClass: "text-orange-600",
    borderClass: "border-orange-300",
    backgroundClass: "bg-orange-50",
    lineClass: "bg-orange-300",
    nodeClass: "bg-orange-500",
  },
  public_transport: {
    label: "電車バス",
    detailLabel: "電車バスでまわれる",
    description: "車なしでまわれる",
    textClass: "text-emerald-600",
    borderClass: "border-emerald-300",
    backgroundClass: "bg-emerald-50",
    lineClass: "bg-emerald-300",
    nodeClass: "bg-emerald-500",
  },
  car: {
    label: "車がおすすめ",
    detailLabel: "車がおすすめ",
    description: "公共交通では行きにくい",
    textClass: "text-blue-600",
    borderClass: "border-blue-300",
    backgroundClass: "bg-blue-50",
    lineClass: "bg-blue-300",
    nodeClass: "bg-blue-500",
  },
};

export function normalizeTransportType(value?: string | null): TransportType {
  if (value === "walking" || value === "public_transport" || value === "car") {
    return value;
  }

  return defaultTransportType;
}
