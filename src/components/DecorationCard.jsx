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
  const kolLabel = decoration.kategorijaNaziv
    ? decoration.kategorijaNaziv
    : decoration.grupa
      ? decoration.grupa.charAt(0).toUpperCase() + decoration.grupa.slice(1)
      : ''

  return (
    <div
      className="group bg-white rounded-xl border border-gray-200 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 transition-all duration-200 ease-out cursor-pointer overflow-hidden flex flex-col"
      onClick={() => onDetail(decoration)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
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
        {tag && (
          <span className={`absolute top-2 left-2 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${TAG_STYLES[tag]}`}>
            {TAG_LABELS[tag]}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 sm:p-4 flex flex-col gap-2.5 flex-1">
        {/* Title + collection badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm sm:text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
            {decoration.naziv}
          </h3>
          {kolLabel && (
            <span className="shrink-0 text-[10px] sm:text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-0.5 leading-tight whitespace-nowrap">
              {kolLabel}
            </span>
          )}
        </div>

        {/* Prices */}
        <div className="flex flex-col gap-1 mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-500">Muška</span>
            <span className="text-xs sm:text-sm font-bold text-rose-600">
              {(decoration.cenaMuska ?? 0).toLocaleString('sr-RS')} RSD
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-500">Ženska</span>
            <span className="text-xs sm:text-sm font-bold text-rose-600">
              {(decoration.cenaZenska ?? 0).toLocaleString('sr-RS')} RSD
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
