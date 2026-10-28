// Small helper so each food entry stays compact in the data files.
//
// food(id, name, category, {
//   age       earliest age in months to offer it (default 6), or null to avoid
//   wait      why to wait, when age > 6 or age is null
//   aka       other names, used by search
//   allergens ids from ALLERGENS
//   choking   "low" | "prep" | "high"
//   iron      true when it is a good source of iron
//   s6/s9/s12 how to serve it at each stage, in plain words
//   tips      short safety and nutrition notes
//   ss        Solid Starts page slug (defaults to id); null for no direct link
//   sym       two-letter tile symbol (defaults to the first letters of name)
// })
export function food(id, name, cat, o = {}) {
  return {
    id,
    name,
    cat,
    aka: o.aka || [],
    age: o.age === undefined ? 6 : o.age,
    wait: o.wait || "",
    allergens: o.allergens || [],
    choking: o.choking || "low",
    iron: !!o.iron,
    serve: { 6: o.s6 || "", 9: o.s9 || "", 12: o.s12 || "" },
    tips: o.tips || [],
    ss: o.ss === undefined ? id : o.ss,
    sym: o.sym || symbolFor(name),
  };
}

function symbolFor(name) {
  const letters = name.replace(/[^A-Za-z]/g, "");
  return letters.charAt(0).toUpperCase() + letters.charAt(1).toLowerCase();
}
