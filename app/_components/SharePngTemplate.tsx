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
  textShadow: "0 2px 8px rgba(0, 0, 0, 0.34)",
};

const minchoFont = {
  fontFamily:
    '"Hiragino Mincho ProN", "Yu Mincho", YuMincho, "Noto Serif JP", serif',
};

function getStartTime(time: string) {
  return time.split("〜")[0]?.trim() || time;
}

export function SharePngTemplate({
  title,
  area,
  infoChips,
  items,
}: SharePngTemplateProps) {
  return (
    <section
      className="relative aspect-[9/16] w-[360px] max-w-full overflow-hidden bg-transparent px-5 py-7 text-white/90"
      aria-label="ROUTY share PNG template"
    >
      <div className="flex h-full flex-col justify-center gap-7">
        <header className="space-y-3 text-center">
          <h1
            className="mx-auto max-w-[320px] text-balance text-[28px] leading-[1.34] font-normal tracking-wide text-white/90"
            style={{ ...minchoFont, ...textShadow }}
          >
            {title}
          </h1>
          <div className="space-y-2.5">
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-18 bg-white/55 shadow-[0_1px_5px_rgba(0,0,0,0.22)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#28B83F]/75 shadow-[0_0_0_3px_rgba(40,184,63,0.12)]" />
              <span className="h-px w-18 bg-white/55 shadow-[0_1px_5px_rgba(0,0,0,0.22)]" />
            </div>
            <p
              className="text-[9px] font-medium tracking-[0.34em] text-white/78"
              style={textShadow}
            >
              {area}
            </p>
          </div>
        </header>

        <div className="space-y-5">
          <ol className="space-y-6">
            {items.map((item, index) => (
              <li
                key={`${item.time}-${item.placeName}`}
                className="grid grid-cols-[62px_18px_minmax(0,1fr)] items-start gap-3"
              >
                <p
                  className="pt-0.5 text-right text-[12px] leading-5 font-normal tracking-wide text-white/84"
                  style={{ ...minchoFont, ...textShadow }}
                >
                  {getStartTime(item.time)}
                </p>
                <div className="relative flex justify-center">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#28B83F]/75 shadow-[0_0_0_3px_rgba(40,184,63,0.1)]" />
                  {index < items.length - 1 ? (
                    <span className="absolute top-5 h-[50px] w-px bg-white/45 shadow-[0_1px_5px_rgba(0,0,0,0.18)]" />
                  ) : null}
                </div>
                <p
                  className="text-[18px] leading-snug font-normal tracking-wide text-white/90"
                  style={{
                    ...minchoFont,
                    ...textShadow,
                    wordBreak: "keep-all",
                    overflowWrap: "normal",
                  }}
                >
                  {item.placeName}
                </p>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap justify-center gap-2">
            {infoChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/45 px-2.5 py-0.5 text-[10px] font-normal tracking-wide text-white/78 backdrop-blur-[1px]"
                style={textShadow}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <footer className="text-center">
          <p
            className="text-[13px] leading-none font-normal tracking-[0.42em] text-white/86"
            style={textShadow}
          >
            ROUTY
          </p>
        </footer>
      </div>
    </section>
  );
}
