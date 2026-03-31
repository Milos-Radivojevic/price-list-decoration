function getImages(d) {
  if (d.slikeUrls?.length) return d.slikeUrls
  if (d.slikaUrl) return [d.slikaUrl]
  return []
}

const TAG_STYLES = {
  novo:   'bg-blue-500/90 text-white',
  akcija: 'bg-red-500/90 text-white',
}
const TAG_LABELS = {
  novo:   'Novo',
  akcija: 'Akcija',
}

export default function DecorationCard({ decoration, onDetail }) {
  const cover = getImages(decoration)[0]
  const tag = decoration.tag && TAG_STYLES[decoration.tag] ? decoration.tag : null
  const grpLabel = decoration.grupa
    ? decoration.grupa.charAt(0).toUpperCase() + decoration.grupa.slice(1)
    : ''

  return (
    <div
      className="group bg-white rounded-xl border border-gray-200 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 transition-all duration-200 ease-out cursor-pointer overflow-hidden flex flex-col"
      onClick={() => onDetail(decoration)}
    >
      {/* Image */}
      <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden bg-gray-100">
        {cover ? (
          <img
            src={cover}
            alt={decoration.naziv}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm">
            Nema slike
          </div>
        )}
        {/* Tag badge (Novo / Akcija) — replaces collection badge on image */}
        {tag && (
          <span className={`absolute top-2 left-2 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${TAG_STYLES[tag]}`}>
            {TAG_LABELS[tag]}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-2.5 sm:p-3.5 flex flex-col gap-1 flex-1">
        {/* Title + collection label inline */}
        <div className="flex items-start gap-1.5">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
            {decoration.naziv}
          </h3>
          {grpLabel && (
            <span className="shrink-0 text-[9px] sm:text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 leading-tight">
              {grpLabel}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-0.5 mt-auto pt-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] sm:text-[11px] text-gray-400">Muška</span>
            <span className="text-xs sm:text-sm font-bold text-rose-600">
              {(decoration.cenaMuska ?? 0).toLocaleString('sr-RS')} RSD
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] sm:text-[11px] text-gray-400">Ženska</span>
            <span className="text-xs sm:text-sm font-bold text-rose-600">
              {(decoration.cenaZenska ?? 0).toLocaleString('sr-RS')} RSD
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
