# Хотын activity — загас барих, өөрийн талбай, хүргэлтийн даалгавар

Огноо: 2026-09-15

## Зорилго

Одоогийн activity-ийн ихэнх (тоо бодох, унших, логик) modal тест учир 3D хот "тест рүү явах зам" болж байна. 3D орон зайг өөрөө ашигладаг, дахин орж ирэх шалтгаан өгдөг гурван хажуугийн activity нэмнэ:

1. **🎣 Загас барих** — сувгийн эрэг дээр timing mini-game, modal-гүй.
2. **🌱 Миний талбай** — фермд 6 нүхтэй өөрийн талбай: үр авах → тарих → услах → хураах (реал цаг ~3 мин).
3. **📬 Хүргэлтийн даалгавар** — хотын төвийн самбараас хугацаатай захиалга авч NPC-д жимс хүргэх.

6 бүлэгт аяллыг өөрчлөхгүй; гурвуулаа эхнээсээ нээлттэй. Өдрийн даалгаврын pool-д нэмэгдэнэ. Хуучин save (`kagome-city-v2`) default утгуудаар нийцтэй ачаалагдана.

## Бүтэц

`src/town/juice.js`-ийн загварыг дагаж activity бүр тусдаа модуль. TownScene-д зөвхөн `new` + `update(dt)` дуудлага нэмэгдэнэ.

```
src/town/fishing.js    FishingGame    — загас барих (3D timing)
src/town/farm.js       FarmPlot       — талбай (state ↔ 3D дүрслэл)
src/town/delivery.js   DeliveryBoard  — захиалгын самбар, хугацаа, HUD
```

Модуль бүр:
- `constructor(scene)` — `scene.state`, `scene.town`, `scene.character`, `scene.particles`, `scene.audio`, `scene.interactables`-ийг ашиглана.
- `setup()` — prop-уудыг scene-д нэмж, `scene.interactables`-д өөрийн interactable-уудыг push хийнэ (`{x, z, r, label|labelFn, icon, action, visible?}` — байгаа формат).
- `update(dt)` — TownScene `updateWorld`-оос дуудагдана.

Interactable `label`-ыг төлөвөөс хамааруулах шаардлагатай (талбайн нүх) тул `updateInteractables` нь `it.label` функц байвал дуудаж хэрэглэнэ (жижиг өргөтгөл).

## Өгөгдөл (`src/core/state.js`)

```js
counts: { harvest, math, read, logic, drive, runner, fish: 0, farm: 0, delivery: 0 }
farm: Array(6) of { type: 4|5|6|7|null, stage: 0..4, since: ms|null }
       // stage 0 хоосон · 1 тарьсан · 2 соёо · 3 навч · 4 ургац
       // since = сүүлд услаад өсөлт эхэлсэн цаг; null = услах шаардлагатай (өсөлт зогссон)
delivery: { done: 0 }
```

Идэвхтэй хүргэлтийн захиалга session-д л амьдарна (хадгалахгүй; reload → цуцлагдана).

Шинэ method:

| Method | Үйлдэл |
|---|---|
| `fishCaught()` | `counts.fish++`, `stars += 8` |
| `plant(i, type)` | нүх хоосон ба `stars >= 10` бол `stars -= 10`, `farm[i] = {type, stage: 1, since: null}`; амжилт → true |
| `water(i)` | `stage 1..3` ба `since === null` бол `since = Date.now()`; true |
| `farmTick(now = Date.now())` | нүх бүрт `since !== null && now - since >= STAGE_MS` бол `stage++`, `since = null` (stage 4-т хүрвэл since=null хэвээр). Шат солигдсон индексүүдийг буцаана (дүрслэл шинэчлэхэд) |
| `farmHarvest(i)` | `stage === 4` бол `inventory[type] += 2`, `counts.farm++`, `counts.harvest += 2`, `stars += 15`, нүх хоосорно; true |
| `deliveryDone(onTime)` | `delivery.done++`, `counts.delivery++`, `stars += onTime ? 30 : 15` |

`STAGE_MS = 60 * 1000` (нэг шат 60 сек; 3 шат × услах = ~3 мин). Шат timestamp-аас тооцогддог тул reload / offline дараа зөв.

`toJSON`-д `farm`, `delivery` нэмэгдэнэ. Constructor default: `farm` = 6 хоосон нүх, `delivery = {done: 0}`.

## Агуулга (`src/core/content.js`)

- `DAILY_POOL` (state.js-д байна) нэмэлт: `{ id: 'fish', goal: 3, text: '3 загас барь', reward: 30, icon: '🐟' }`, `{ id: 'farm', goal: 1, text: 'Талбайгаас 1 ургац хураа', reward: 35, icon: '🌱' }`, `{ id: 'delivery', goal: 2, text: '2 хүргэлт хий', reward: 40, icon: '📬' }`.
- `LANDMARKS` нэмэлт: `{ name: 'Захиалгын самбар', emoji: '📬', x: 5, z: -19, color: '#e07a3f' }`, `{ name: 'Миний талбай', emoji: '🌱', x: 56, z: -38, color: '#61a148' }`. (Индекс 9, 10 — CHAPTERS-ийн landmark индексүүд өөрчлөгдөхгүй.)
- Брокколи Бобогийн `lines`-д "Фермийн зүүн талд өөрийн талбай бий — үрийн савнаас үр аваад тарь!" мөр нэмнэ.

## Байршил

| Зүйл | Байршил | Тайлбар |
|---|---|---|
| Загасны цэг | (16, −25), r=3 | Загасчин (16, −20)-ийн хажууд, сувгийн баруун эрэг. Хөвүүр x≈21 рүү шидэгдэнэ |
| Талбай | төв (56, −38); 2 багана × 3 мөр, алхам 1.8 | Фермийн хашааны (x=51) гадна зүүн тал. `town.js`-ийн санамсаргүй чимэглэлийн шүүлтүүрт `x > 52 && x < 60 && z > -43 && z < -33` хориглоно |
| Үрийн сав | (53.5, −38) | Prop (хайрцаг) + мэдээллийн interactable |
| Захиалгын самбар | (5, −19) | Усан оргилуур (0, −15)-ийн зүүн урд; шон + `P.sign` |

## 🎣 Загас барих (`fishing.js`)

Төлөв машин: `idle → cast → wait → bite → (caught | missed) → cast …`

1. Interactable (16, −25) "Загас барих" E → `cast`: дүр суваг руу (+x) эргэнэ, `idle` анимац. Хөвүүр (улаан toon бөмбөг r=0.12 + шугам `T.Line` дүрийн гараас) 0.5 сек параболоор (16.5, 1.2) → (21 ± 1, −0.3, −25 ± 1) бууна, `audio.splash`, жижиг цацрал.
2. `wait`: 2–6 сек санамсаргүй; хөвүүр `sin`-ээр зөөлөн бөмбөрнө. Prompt: "🎣 Хүлээ…". E дарвал → toast "Хараахан хазаагүй…", `audio.wrong`, `cast` дахин.
3. `bite`: хөвүүр 0.35 живнэ, ус цацрал (`particles.burst` цэнхэр), `audio.splash`, prompt "🎣 E — Тат!" (анивчина). **1.0 сек цонх.**
   - Цонхонд E → `caught`: `state.fishCaught()`, `character.cheer()`, загас (toon эллипсоид + сүүл, 0.35 м, цэнхэр-мөнгөн) хөвүүрээс дүр рүү 0.6 сек параболоор нисч алга болно, particles алтан, `audio.correct`, toast "🐟 Загас барилаа! +8 од", `progress('fish', 1)`, `pop($('starCount'))`, `commit()`. 1 сек дараа `cast` автоматаар.
   - Цонх өнгөрвөл → `missed`: хөвүүр гарч ирнэ, toast "Загас мултарлаа…", `audio.wrong`, 0.8 сек дараа `cast`.
4. Тоглогч хөдөлвөл (`player.vel` > 0.5 эсвэл зайнаас гарвал), машинд суувал, modal нээгдвэл → `idle`: хөвүүр/шугам/загас устгана, prompt хэвийн.

Загасчин NPC-ийн одоогийн "хааяа загас барих" анимац хэвээр.

Загас барих үед `interact()` нь FishingGame-д давуу эрхтэй очно: `scene.fishing.active` бол E-г FishingGame `press()` авна (interactable-уудыг үл харгалзана).

## 🌱 Талбай (`farm.js`)

6 нүх тус бүр interactable r=1.4, `label` функц:

| stage / since | Label | E үйлдэл |
|---|---|---|
| 0 | "🌱 Тарих" | Тарих modal |
| 1–3, since=null | "💧 Услах" | `water(i)`: дүр `pick` анимац, усны particle (цэнхэр, доош), `audio.splash`, since=now |
| 1–3, since≠null | "⏳ Ургаж байна · m:ss" (үлдсэн хугацаа) | toast "Ургаж байна, түр хүлээ" |
| 4 | "🥕 Хураах" (тухайн ногооны emoji/нэр) | `farmHarvest(i)`: `pick`, particles (ногооны өнгө), `audio.pickup(type)`, toast "+2 ургац, +15 од", `progress('farm',1)`, `progress('harvest',2)`, `pop($('fruitCount'))`, `commit()` |

**Тарих modal** (`modal()`): 4 ногооны карт (🥕 Лууван, 🍅 Улаан лооль, 🥦 Брокколи, 🎃 Хулуу) тус бүр "10 од"; `stars < 10` бол бүгд disabled + hint "Од хүрэлцэхгүй — жимс түүж од цуглуул". Сонгох → `plant(i,type)`, `audio.pickup`, modal хаагдана, toast "Тарилаа! Одоо услаарай 💧".

**3D дүрслэл** (нүх бүр өөрийн `T.Group`, `rebuild(i)`-ээр шатаас дахин бүтээгдэнэ):
- Хөрс: 1.4×0.14×1.4 `toon(0xa5744c)` хайрцаг (үргэлж).
- stage 1: 3 жижиг үр (бор бөмбөг r=0.06) хөрсөнд.
- stage 2: соёо — ногоон конус h=0.35.
- stage 3: навч бөөгнөрөл — 3 конус/сфер h=0.6, `swayMats`-д нэмж салхинд найгана (боломжтой бол).
- stage 4: `P.fruit(type, …, scale 0.75)` + glow цагираг (одоогийн harvest-тэй адил).
- `since !== null` бол хөрс дээр бараан "чийгтэй" толбо (0xa5744c → 0x7a5334 өнгө шилжүүлнэ).

`update(dt)`: 0.5 сек тутамд `state.farmTick()` → шат солигдсон нүхийг `rebuild`, particles жижиг "ургалт" цацрал, `audio.pickup`; toast зөвхөн stage 4-т хүрвэл "Ургац бэлэн боллоо! 🌱" (тоглогч талбайгаас хол байвал ч гарна — буцаж ирэх дуудлага).

**Үрийн сав** — prop (2 давхар crate) + interactable "Үрийн сав" → мэдээллийн modal: "4 ногооны үр, тус бүр 10 од. Нүх дээр E дарж тарь, услах бүрт 1 минут ургана, 3 удаа услахад ургац бэлэн."

## 📬 Хүргэлт (`delivery.js`)

**Самбар prop:** шон (цилиндр h=2.6) + `P.sign('ЗАХИАЛГА', …)` + жижиг дугтуй тэмдэг. Interactable (5, −19) r=3 "Захиалгын самбар".

**Захиалга үүсгэх** (`newOrder()`): хүлээн авагч = `town.npcs`-ээс самбараас ≥25 м зайтай нэг (Алим Ану ойрхон тул хасагдана); жимс `type` = FRUITS-ээс санамсаргүй (0–7), тоо = 2 (60%) / 3 (40%); хугацаа `sec = Math.round(30 + dist * 1.2)` (~60–110 с). Захиалга `{npc, type, count, sec}`.

**Самбарын modal:**
- Идэвхтэй захиалга байхгүй: захиалгын карт (NPC emoji+нэр, жимс×тоо, хугацаа, зай), "Хүлээн авах" (inventory[type] ≥ count биш бол disabled + мөр "🍇 2 хэрэгтэй, чамд 0 — цэцэрлэг/фермээс түү"), "Өөр захиалга" (шинэ random), "Хаах".
- Идэвхтэй захиалга байгаа: тойм + үлдсэн хугацаа, "Цуцлах" (шагналгүй, goal сэргээнэ), "Хаах".

**Хүлээн авах** → `active = {…order, start: performance.now()}`; `scene.setGoal({x: npc.x, z: npc.z})`; `#deliveryHud` харагдана; toast "Захиалга авлаа! Алтан тэмдгийг дагаарай"; `audio.ui`.

**HUD** (`#deliveryHud`, index.html-д шинэ div, HUD-ийн дээд хэсэгт): "📬 Үзэм Үүлээ · 🍇×2 · 1:24". `update(dt)` секунд тоолно; ≤10 с бол `.urgent` класс (улаан анивчих). 0 болсны дараа "0:00 · хоцорч байна" — цуцлагдахгүй.

**Хүргэх:** NPC interactable-ийн `action`-д: `scene.delivery.active?.npc === n` бол `talk(n)`-ийн оронд `scene.delivery.deliver(n)`:
- `inventory[type] -= count`; `onTime = elapsed <= sec`; `state.deliveryDone(onTime)`.
- NPC `cheer()`, дүр `wave`, particles алтан, `audio.fanfare` (on time) / `audio.correct` (хоцорсон).
- modal: NPC толгой + "Баярлалаа! +30 од" / "Хоцорсон ч баярлалаа! +15 од", "Үргэлжлүүлэх".
- `progress('delivery', 1)`, `scene.setGoalForChapter()`, HUD нуугдана, `active = null`, `commit()`.
- Хүрэх үед inventory хүрэлцэхгүй болсон бол (шүүсний лабораторид зарцуулсан г.м): modal "Жимс дутуу байна — 🍇 2 хэрэгтэй", захиалга хэвээр.

Машинд сууж явах нь зөвшөөрөгдөнө (хурдан хүрэх арга). Машинаас буугаад NPC-д E дарна.

## Нийтлэг

- **Цуглуулгын самбар** (`collection()`): "🐟 Загас N · 🌱 Ургац N · 📬 Хүргэлт N" мөр.
- **Газрын зураг / minimap:** шинэ 2 landmark автоматаар (LANDMARKS-аас зурдаг).
- **Аудио:** байгаа `splash / pickup / correct / wrong / fanfare / ui` — шинэ дуу нэмэхгүй.
- **Гүйцэтгэл:** талбайн нүх бүр ≤ 6 mesh, хөвүүр/загас 3 mesh — draw call нөлөө үл тоомсорлож болох хэмжээнд.
- **Хадгалалт:** `state.save()` — `commit()`-ээр (одоогийн загвар). `farm` массив, `counts` шинэ түлхүүрүүд хуучин save-д байхгүй бол default.

## Алдаа / ирмэгийн тохиолдол

- Reload үед идэвхтэй хүргэлт алга болно — HUD/goal сэргээгдэхгүй (зориуд, энгийн байлгах).
- Талбайн `since` ирээдүйн цаг (систем цаг буцсан) бол `farmTick` зүгээр хүлээнэ; `since` хол өнгөрсөн бол нэг л шат урагшлана (услах шаардлага хэвээр).
- Загас барих үед modal нээгдвэл (Esc цэс) → `idle` рүү цуцлагдана.
- Хүргэлтийн NPC нь `quest`-тэй (Лулу/Үүлээ/Мими/Хүслэн) байсан ч идэвхтэй захиалгатай бол хүргэлт давуу.

## Тест

- **Unit (Vitest, шинэ):** `vitest` devDependency, `npm test`. `tests/state.test.js`:
  - `farmTick`: услаагүй нүх хөдлөхгүй; 60 с дараа 1 шат; 5 мин дараа ч 1 шат л (дахин услах хэрэгтэй); stage 4-т хүрсний дараа өсөхгүй.
  - `plant`: од хүрэлцэхгүй → false; хоосон бус нүх → false; амжилт од хасна.
  - `farmHarvest`: stage 4 биш → false; амжилт inventory+2, counts, од.
  - `fishCaught`, `deliveryDone(true/false)` шагнал.
  - Хуучин save (farm/delivery/counts.fish байхгүй JSON) ачаалахад default утгууд, `toJSON` тэдгээрийг агуулна.
  - `DAILY_POOL` шинэ id-ууд `dailyProgress`-т ажиллана.
- **Гар тест (Playwright харагдах browser, хэрэглэгч өөрөө):** загас 3 төлөв (эрт/зөв/хоцорсон), талбай бүтэн цикл (тарих→3 услах→хураах), хүргэлт (хугацаанд/хоцорсон/жимс дутуу/цуцлах), хуучин save-тэй ачаалалт, minimap дээр шинэ landmark.

## Хамрах хүрээнд ОРОХГҮЙ

Ховор загас, загасны inventory/зарах, ус авч зөөх, гинжин хүргэлт, алхдаг иргэдийн даалгавар, шинэ бүлэг, шинэ дуу/хөгжим.
