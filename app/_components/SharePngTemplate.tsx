export type SharePngTemplateItem = {
  time: string;
  placeName: string;
};

export type SharePngTemplateProps = {
  title: string;
  area: string;
  infoChips: string[];
  items: SharePngTemplateItem[];
};

const textShadow = {
  textShadow:
    "0 2px 4px rgba(0, 0, 0, 0.55), 0 6px 14px rgba(0, 0, 0, 0.35)",
};

const strongTextShadow = {
  textShadow:
    "0 3px 6px rgba(0, 0, 0, 0.65), 0 8px 18px rgba(0, 0, 0, 0.4)",
};

const minchoFont = {
  fontFamily:
    '"Hiragino Mincho ProN", "Yu Mincho", YuMincho, "Noto Serif JP", serif',
};

function getStartTime(time: string) {
  return time.split("〜")[0]?.trim() || time;
}

function splitTitleByFullWidthSpace(title: string) {
  const trimmedTitle = title.trim() || "休日ルート";

  if (trimmedTitle.includes("　")) {
    return trimmedTitle
      .split("　")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [trimmedTitle];
}

function getAreaName(area: string) {
  return area
    .replace(/^📍\s*/u, "")
    .replace(/\s*エリア$/u, "")
    .trim();
}

function getAreaTextSize(areaName: string) {
  const length = Array.from(areaName).length;
  if (length <= 4) return "text-[17px]";
  if (length <= 6) return "text-[14px]";
  return "text-[11px]";
}

export function SharePngTemplate({
  title,
  area,
  infoChips,
  items,
}: SharePngTemplateProps) {
  const titleLines = splitTitleByFullWidthSpace(title);
  const areaName = getAreaName(area);
  const timelineItems = items.slice(0, 3);

  return (
    <section
      className="relative aspect-[4/5] w-[360px] max-w-full overflow-hidden bg-transparent text-white/90"
      aria-label="ROUTY share PNG template"
    >
      <div className="absolute top-9 left-6 h-[132px] w-[310px]">
        <div className="w-[244px]">
          <h1
            className="w-[252px] leading-[1.14] font-medium tracking-wide text-white/90"
            style={{ ...minchoFont, ...strongTextShadow }}
          >
            {titleLines.map((line, index) => (
              <span
                key={`${line}-${index}`}
                className={`block ${
                  titleLines.length === 1
                    ? "text-[27px]"
                    : index === 0
                      ? "whitespace-nowrap text-[28px]"
                      : "whitespace-nowrap text-[34px]"
                }`}
              >
                {line}
              </span>
            ))}
          </h1>
        </div>

        {areaName ? (
          <p
            className={`absolute top-[72px] right-[-4px] flex h-[88px] w-[88px] items-center justify-center rounded-full border border-white/60 bg-white/5 px-2 text-center leading-none font-semibold tracking-[0.02em] whitespace-nowrap text-white/84 backdrop-blur-[1px] ${getAreaTextSize(areaName)}`}
            style={textShadow}
          >
            {areaName}
          </p>
        ) : null}
      </div>

      <div className="absolute top-[190px] left-9 h-[154px] w-[286px]">
        <ol className="relative">
          {timelineItems.length > 1 ? (
            <span className="absolute top-3 bottom-7 left-[7px] w-px bg-white/45 shadow-[0_1px_5px_rgba(0,0,0,0.18)]" />
          ) : null}
          {timelineItems.map((item) => (
            <li
              key={`${item.time}-${item.placeName}`}
              className="grid h-[52px] grid-cols-[18px_minmax(0,1fr)] items-start gap-3"
            >
              <div className="relative z-10 flex justify-center">
                <span className="mt-2 h-2 w-2 rounded-full bg-[#28B83F]/75 shadow-[0_0_0_3px_rgba(40,184,63,0.1)]" />
              </div>
              <div className="min-w-0">
                <p
                  className="pt-0.5 text-left text-[12px] leading-5 font-medium tracking-wide text-white/84"
                  style={{ ...minchoFont, ...textShadow }}
                >
                  {getStartTime(item.time)}
                </p>
                <p
                  className="min-w-0 overflow-hidden text-[15px] leading-5 font-medium tracking-wide text-ellipsis whitespace-nowrap text-white/90"
                  style={{
                    ...minchoFont,
                    ...strongTextShadow,
                    wordBreak: "keep-all",
                  }}
                >
                  {item.placeName}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="absolute right-5 bottom-[58px] left-5 flex flex-wrap justify-center gap-2">
        {infoChips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-white/45 bg-white/5 px-3 py-1 text-[11px] font-normal tracking-wide text-white/78 backdrop-blur-[1px]"
            style={textShadow}
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="absolute right-0 bottom-[45px] left-0 flex items-center justify-center gap-3">
        <span className="h-px w-14 bg-white/55 shadow-[0_1px_5px_rgba(0,0,0,0.22)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#28B83F]/75 shadow-[0_0_0_3px_rgba(40,184,63,0.12)]" />
        <span className="h-px w-14 bg-white/55 shadow-[0_1px_5px_rgba(0,0,0,0.22)]" />
      </div>

      <footer className="absolute right-0 bottom-7 left-0 text-center">
        <p
          className="text-[14px] leading-none font-normal tracking-[0.42em] text-white/86"
          style={textShadow}
        >
          ROUTY
        </p>
      </footer>
    </section>
  );
}
