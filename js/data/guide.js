// General starting-solids guidance shown on the Guide tab.
// Each section: { id, title, intro, items?: [{ id?, title?, text }], note? }
// The readiness items have ids: they're a checklist the family can tick.

export const GUIDE = [
  {
    id: "ready",
    title: "Is baby ready?",
    intro:
      "Most babies are ready for solids around 6 months. Age alone is not the signal; look for all of these signs together.",
    items: [
      { id: "sits", title: "Sits with little or no support", text: "Baby can sit upright in a high chair and hold their head steady." },
      { id: "mouth", title: "Brings things to their mouth", text: "Grabs toys or food and gets them to their mouth on purpose." },
      { id: "tongue", title: "Tongue-thrust reflex has faded", text: "Food put in the mouth is not automatically pushed back out." },
      { id: "interest", title: "Shows interest", text: "Watches you eat, leans toward food, or opens their mouth when food comes close." },
    ],
    note: "Babies born early, or with feeding or developmental concerns, may need a different timeline. Check with your pediatrician.",
  },
  {
    id: "setup",
    title: "Setting up a safe meal",
    intro: "A few habits make every meal safer.",
    items: [
      { text: "Seat baby upright at 90 degrees in a high chair with a footrest. Never feed in a car seat, stroller, bouncer or while lying back." },
      { text: "Always stay within arm's reach and watch baby while they eat." },
      { text: "Let baby set the pace. Don't put food in their mouth faster than they can manage, and never force food." },
      { text: "Keep meals calm, with no screens or running around while eating." },
      { text: "Learn infant first aid and CPR before you start. Many hospitals and community groups run short classes." },
    ],
  },
  {
    id: "gagging",
    title: "Gagging vs. choking",
    intro:
      "Gagging is a normal, protective reflex that pushes food forward. Choking means the airway is blocked. Knowing the difference keeps you calm when you need to be, and ready to act when you have to.",
    items: [
      {
        title: "Gagging: loud and red",
        text: "Coughing, sputtering, retching, tongue pushing forward, watery eyes. Baby is working it out. Stay calm, stay close and let them clear it.",
      },
      {
        title: "Choking: quiet and pale",
        text: "Silent or unable to cry or cough, high-pitched noises, struggling to breathe, lips or face turning blue or gray. Start infant first aid immediately and call emergency services.",
      },
    ],
    note: "Gagging is common in the first months of solids and gets less frequent as skills improve.",
  },
  {
    id: "sizes",
    title: "Sizes and shapes by age",
    intro: "How you cut food matters as much as what you serve.",
    items: [
      {
        title: "6–8 months: big and soft",
        text: "Baby grabs with the whole hand, so offer long pieces about the size of an adult finger or two, soft enough to squish between your thumb and finger. Purees and mashes on a pre-loaded spoon are great too.",
      },
      {
        title: "9–11 months: bite-size and soft",
        text: "The pincer grasp (thumb and finger) is developing. Offer small soft pieces about the size of a chickpea, and flatten round foods.",
      },
      {
        title: "12 months +: more textures",
        text: "Bite-size pieces of most family foods, with more practice using forks and spoons. Keep modifying round, hard and sticky foods.",
      },
    ],
  },
  {
    id: "hazards",
    title: "Common choking hazards",
    intro: "These foods cause the most choking incidents in young children. Modify them, or wait.",
    items: [
      { title: "Round foods", text: "Grapes, cherry tomatoes, blueberries, olives: quarter lengthwise or flatten. Keep doing this until at least age 4." },
      { title: "Hard raw fruit and vegetables", text: "Apple, carrot, celery, radish: cook until soft, grate finely, or slice paper-thin." },
      { title: "Whole nuts and seeds", text: "Serve ground or as a thinned smooth butter until at least age 4." },
      { title: "Sticky globs", text: "Thick nut butter or a lump of soft bread: thin, spread or toast it." },
      { title: "Tubes and coins", text: "Hot dogs, sausages, string cheese, carrots: cut lengthwise first, then into small pieces." },
      { title: "Chunks of meat and cheese", text: "Shred meat or serve large strips to gnaw; slice or shred cheese." },
      { title: "Not before age 4", text: "Popcorn, whole nuts, hard candy, marshmallows, chewing gum." },
    ],
  },
  {
    id: "allergens",
    title: "Introducing common allergens",
    intro:
      "Research shows that introducing allergens like peanut and egg early in the first year, and keeping them in the diet, lowers the chance of developing an allergy.",
    items: [
      { text: "Start with one new allergen at a time, in a small amount, earlier in the day so you can watch baby for a couple of hours afterwards." },
      { text: "If there is no reaction, gradually increase the amount over the next few servings." },
      { text: "Once an allergen is tolerated, keep offering it regularly (about twice a week). This app flags introduced allergens that haven't been offered in a week." },
      { text: "Babies with severe eczema, or an existing food allergy, have a higher risk. Talk to your pediatrician or an allergist before introducing peanut and other allergens." },
    ],
    note: "The nine most common allergens are milk, egg, peanut, tree nuts, sesame, soy, wheat, fish and shellfish.",
  },
  {
    id: "reactions",
    title: "Signs of an allergic reaction",
    intro: "Most reactions happen within minutes to two hours of eating.",
    items: [
      { title: "Mild to moderate", text: "Hives or welts, redness around the mouth, swelling of lips, face or eyes, vomiting, tummy pain. Stop the food and call your pediatrician for advice." },
      {
        title: "Severe: call emergency services",
        text: "Any trouble breathing, wheezing, persistent coughing, swelling of the tongue or throat, repeated vomiting, pale or floppy, unusually sleepy. This can be anaphylaxis.",
      },
      { title: "Not an allergy", text: "A red rash just around the mouth after acidic foods like tomato, citrus or strawberries is usually contact irritation and fades quickly." },
    ],
  },
  {
    id: "avoid",
    title: "Foods to avoid or delay",
    intro: "A short list of things to skip in the first year (and some beyond).",
    items: [
      { title: "Honey (under 12 months)", text: "Including cooked or baked into foods. It can cause infant botulism." },
      { title: "Cow's milk as a drink (under 12 months)", text: "It's fine in cooking and as yogurt or cheese, but breast milk or formula remains the main drink." },
      { title: "Juice (under 12 months)", text: "Offer whole fruit instead." },
      { title: "Added salt and sugar", text: "No added salt for babies; no added sugar before age 2." },
      { title: "Raw or undercooked foods", text: "Runny eggs, rare meat, raw fish and shellfish, raw sprouts." },
      { title: "Unpasteurized dairy and juice", text: "Raw milk, cheeses made from raw milk, unpasteurized juices." },
      { title: "High-mercury fish", text: "Shark, swordfish, king mackerel, marlin, orange roughy, tilefish and bigeye tuna." },
      { title: "Rice milk (under 5)", text: "Because of arsenic, and vary grains so rice isn't an everyday staple." },
    ],
  },
  {
    id: "iron",
    title: "Why iron matters",
    intro:
      "Around 6 months, the iron babies are born with starts to run low, and breast milk alone doesn't provide enough. Aim to include an iron-rich food at most meals.",
    items: [
      { title: "Easily absorbed (heme) iron", text: "Beef, lamb, dark-meat poultry, liver, sardines, mussels." },
      { title: "Plant (non-heme) iron", text: "Lentils, beans, chickpeas, tofu, iron-fortified cereal, quinoa, dark leafy greens, pumpkin seeds." },
      { title: "Boost absorption", text: "Pair plant iron with vitamin C: tomato, bell pepper, broccoli, citrus, strawberries, kiwi." },
    ],
    note: "Use the “Iron-rich” filter on the Foods tab to see them all.",
  },
  {
    id: "how-much",
    title: "How much and how often",
    intro: "Early on, solids are for learning. Breast milk or formula still provides most nutrition until about 12 months.",
    items: [
      { text: "Start with one meal a day, building to two around 7–8 months and three around 9 months, plus snacks after 12 months." },
      { text: "Let baby decide how much to eat. Some days they eat a lot; some days almost nothing." },
      { text: "It can take 10 or more tries before a baby accepts a new food. A grimace is not a no. Keep offering without pressure." },
      { text: "Offer a small amount of water in an open cup with meals from 6 months." },
    ],
  },
];
