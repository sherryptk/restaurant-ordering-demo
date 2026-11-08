// Shape the server expects for an item's whole options tree. Also what the
// bulk editor diffs against, so blank/null variants must normalise identically.
export function optionsPayload(options) {
  return options.map((opt, i) => ({
    name: opt.name,
    name_ar: opt.name_ar || '',
    required: Boolean(opt.required),
    multi_select: Boolean(opt.multi_select),
    max_selections: opt.multi_select && opt.max_selections !== '' && opt.max_selections != null ? opt.max_selections : null,
    position: i,
    choices: opt.choices.map((c, j) => ({
      label: c.label,
      label_ar: c.label_ar || '',
      price_delta: c.price_delta === '' || c.price_delta == null ? 0 : Number(c.price_delta),
      available: Boolean(c.available),
      position: j,
    })),
  }))
}
