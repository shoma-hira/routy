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
  if (length <= 4) return "text-[20px]";
  if (length <= 6) return "text-[16px]";
  return "text-[13px]";
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
      <div className="pngTopGradient absolute inset-x-0 top-0 h-[155px]" />
      <div className="absolute top-9 left-6 h-[132px] w-[310px]">
        <div className="w-[244px]">
          <h1
            className="pngTitleShadow w-[252px] leading-[1.08] font-bold tracking-wide text-white/90"
            style={minchoFont}
          >
            {titleLines.map((line, index) => (
              <span
                key={`${line}-${index}`}
                className={`block ${
                  titleLines.length === 1
                    ? "text-[31px]"
                    : index === 0
                      ? "whitespace-nowrap text-[32px]"
                      : "whitespace-nowrap text-[40px]"
                }`}
              >
                {line}
              </span>
            ))}
          </h1>
        </div>

        {areaName ? (
          <p
            className={`pngTextShadow pngAreaBackdrop absolute top-[72px] right-[-4px] flex h-[88px] w-[88px] items-center justify-center rounded-full px-2 text-center leading-none font-bold tracking-[0.02em] whitespace-nowrap text-white/84 ${getAreaTextSize(areaName)}`}
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
                  className="pngSmallTextShadow pt-0.5 text-left text-[13px] leading-5 font-semibold tracking-wide text-white/84"
                  style={minchoFont}
                >
                  {getStartTime(item.time)}
                </p>
                <p
                  className="pngTextShadow min-w-0 overflow-hidden text-[17px] leading-5 font-bold tracking-wide text-ellipsis whitespace-nowrap text-white/90"
                  style={{
                    ...minchoFont,
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
            className="pngSmallTextShadow rounded-full border border-white/45 bg-white/5 px-3 py-1 text-[12px] font-semibold tracking-wide text-white/78"
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
          className="pngTextShadow text-[15px] leading-none font-medium tracking-[0.42em] text-white/86"
        >
          ROUTY
        </p>
      </footer>
    </section>
  );
}
