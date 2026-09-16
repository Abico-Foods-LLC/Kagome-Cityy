# Gameplay ба polish багц — маркет, алтан лууван, асуулт, хүсэлт, нохой, хөгжим, photo mode, утас

Огноо: 2026-09-16

## Зорилго

Тоглоомын "гогцоо" бүрдүүлэх (од олох → зарцуулах → хотоор тэнүүчлэх шалтгаан) ба мэдрэмжийг сайжруулах 8 дэд ажил. Бүгд одоогийн бүтцийг (activity модуль `constructor(scene) → setup() → update(dt)`, GameState-д логик, procedural дүрслэл) дагана. Хуучин save (`kagome-city-v2`) default утгуудаар нийцтэй ачаалагдана.

| # | Ажил | Шинэ файл |
|---|---|---|
| A | Маркет 5 tab (машин, нохой, trail, гэр) | `src/town/shop.js` |
| B | Алтан лууван ×20 | `src/town/carrots.js` |
| C | Асуултын сан 45, түвшин | — (`content.js`, `state.js`) |
| D | Иргэдийн өдрийн хүсэлт | `src/town/requests.js` |
| E | Нохойтой тоглох (бөмбөг, өргөх) | — (`animals.js`, `TownScene.js`) |
| F | Хөгжмийн 4 хувилбар | — (`audio.js`) |
| G | Photo mode | `src/town/photo.js` |
| H | Утасны гүйцэтгэл, FPS overlay | — (`main.js`, `TownScene.js`) |

## A. Маркет өргөтгөл

**Каталог** — `content.js`-д `SHOP` массив; бараа бүр `{ id, cat, name, emoji, price, slot?, data }`.
- `cat: 'wear'` — одоогийн `ACCESSORIES` (id, slot hat/glasses/extra) хэвээр, каталогт орно.
- `cat: 'car'` — будаг `car.paint.red|blue|green|pink|purple` (120, slot `carPaint`, data `{ body, dark }` өнгө); чимэг `car.flag` (80), `car.antenna` (60), `car.crate` (100) (slot `carDecor`). Default улбар шар будаг үнэгүй, `carPaint` хоосон = default.
- `cat: 'dog'` — `dog.collar.blue|green|gold` (40, slot `dogCollar`), `dog.bandana` (70, slot `dogExtra`), `dog.hat` (90, slot `dogHat`).
- `cat: 'trail'` — `trail.stars` (300), `trail.petals` (350), `trail.rainbow` (500) (slot `trail`).
- `cat: 'home'` — `home.flowers` (80), `home.lamp` (100), `home.bunting` (120), `home.scarecrow` (150), `home.mailbox` (60), `home.bench` (90). Slot байхгүй: авмагц тогтмол байрлалдаа харагдана.

**State** — `wardrobe.owned` (массив, id) ба `wardrobe.equipped` (slot → id) хэвээр; `buyAccessory(id, price)` → `buy(id, price)`, `equip(id, slot)` хэвээр; `unequip(slot)` нэмнэ. Хуучин save-ийн `owned: ['cap']` г.м id-ууд хэвээр ажиллана.

**Дүрслэл**
- Машин: `props.buggy` body/dark материалыг `toon(..., { key: 'buggyBody'|'buggyD' })` кэшээр авдаг тул `applyCarPaint()` нь тэдгээрийн `.color`-ыг солино. Чимэг: `props.carDecor(chassis, kind)` — туг (шон + гурвалжин, салхинд `rotation` sin), антенн (нарийн цилиндр + гялалзах бөмбөг), хайрцаг (дээвэр дээр жижиг crate + 3 жимс). Нэг удаад нэг чимэг.
- Нохой: `Dog.wear({ collar, extra, hat })` — хүзүүвчийн torus өнгө, бандана (гурвалжин даавуу хүзүүнд), малгай (жижиг cap/cone). Дахин дуудахад хуучныг арилгана.
- Trail: TownScene `updateTrail(dt)` — алхаж/гүйж байхад 0.08с тутам тоглогчийн хөлний ард particle (од: шар ✨ жижиг burst; дэлбээ: ягаан удаан унах; солонго: 6 өнгө дараалан). Машинд суусан үед машины ард.
- Гэр: «Миний булан» — талбайн (CENTER 56,−38) баруун талд, замаас хол, хоосон газар; байрлалыг browser дээр шалгаж сонгоно. Зүйл бүр `props`-ийн бэлэн/шинэ жижиг функц; `HomeDecor.refresh()` owned-ийг харуулна.

**UI** — `src/town/shop.js` `ShopUI` (`open(tab)`): tab товчнууд, бараа карт (`.shop-item`), "⭐ үнэ" / "Өмсөх" / "Өмссөн ✓" / "Тайлах"; худалдан авахад `audio.correct`, toast, HUD одны тоо. Гэрийн бараанд "Байрлуулсан ✓". TownScene-ийн `shop()` → `this.shopUI.open()`.

## B. Алтан лууван ×20

`src/town/carrots.js` `GoldenCarrots`:
- `CARROT_SPOTS` — 20 `{ id, x, y, z, hint }` (дээвэр, модны ар, гүүрний доор, арал, сувгийн ёроол, хүрдний дээр, самбарын ард, ширэнгийн хаалганы дэргэд...). Browser дээр бүгдэд хүрч болохыг (үсрэлт/сэлэлт) шалгана.
- Mesh: `ConeGeometry` (алтан glow toon) + 2 навч; эргэлдэж (`rotation.y += dt*2`), хөвнө (`sin`); 0.5с тутам sparkle particle. Instanced биш — 20 л.
- Авах: тоглогч (эсвэл машин) 1.3м дотор орвол автоматаар — `state.collectCarrot(id)` → +10 од, fanfare-ийн богино хувилбар, burst, toast `🥕 x/20`. Mesh scene-ээс арилна.
- Ойртох чимээ: хамгийн ойрын аваагүй лууван 12м дотор бол 2с тутам зөөлөн tone (ойр байх тусам өндөр давтамж).
- 20 бүгд → +300 од, `goldcrown` аксессуар (`ACCESSORIES`-д `price: 0, secret: true` — дэлгүүрт зөвхөн нээгдсэн үед харагдана) owned болно, том fanfare, toast.
- State: `carrots: string[]` (Set), `collectCarrot(id)` → `{ count, done }`. HUD: `🥕 n/20` (одны хажууд). Цуглуулгын цонхонд мөр.

## C. Асуултын сан, түвшин

- `QUESTIONS[type]` элемент бүрд `level: 1 | 2`. Одоогийн 15-ыг `level` тэмдэглэж (math 6, read 4, logic 5 — хүндээр нь 1 эсвэл 2), шинэ асуултуудыг **ард нь** нэмж төрөл бүр 15 (level 1 ≈ 7–8, level 2 ≈ 7–8). Solved key `type+index` хэвээр → хуучин ахиц хадгалагдана.
- `settings.level: 1 | 2` (default 1). `nextQuestion(type)` → тухайн level-ийн шийдээгүй эхнийх; бүгд шийдэгдвэл −1 (одоогийн "бүрэн давлаа" modal). `answer()` өөрчлөгдөхгүй.
- Цэсний тохиргоо: «Сорилын түвшин: Бага (6–8) / Ахлах (9–12)» select. `ask()`-ийн eyebrow-д түвшин: `ТОО БОДОХ ЗАХ · Бага · 5 үлдсэн`.
- Vitest: level шүүлт, хуучин solved нийцтэй.

## D. Иргэдийн өдрийн хүсэлт

`src/town/requests.js` `CitizenRequests`:
- State: `requests: { date, list: [{ c: citizenIndex, type: 'fruit'|'dog', fruit?, n?, done }] }`; `ensureRequests(citizenCount)` — өдөр солигдоход 2 өөр иргэн санамсаргүй (`type` санамсаргүй, fruit 0..7, n 2–3). `fulfillRequest(i)` → inventory хасаж/шалгаад +30 од, `done`, `dailyProgress('request')`. DAILY_POOL-д `{ id: 'request', goal: 1, text: 'Иргэний 1 хүсэлт биелүүл', reward: 35, icon: '❗' }`.
- Дүрслэл: хүсэлттэй, биелээгүй иргэн 6с тутам ❗ бөмбөлөг; interactable icon `❗`, label `«Нэр — хүсэлт»`.
- `talkCitizen` — хүсэлттэй бол modal-д хүсэлтийн текст + товч: fruit → `Өгөх (🍎 ×2)` (inventory хүрэлцэхгүй бол disabled + «Танд 1 байна»); dog → «Луувсай энд байна!» (нохой 4м дотор биш бол disabled + «Луувсайг дагуулж ир»). Биелэхэд иргэн cheer, ❤️ бөмбөлөг, particle, toast.

## E. Нохойтой тоглох

- **Бөмбөг**: `F` (гар) / 🎾 HUD товч (touch, `state.pet` үед л харагдана). Тоглогч хөл дээрээ, нохой байгаа, бөмбөг чөлөөтэй үед: `Ball` (шар сфер, 0.18) тоглогчийн урдаас heading чиглэлд `v=(sin·9, 6, cos·9)`, gravity 20, газарт хүрэхэд 1 удаа ойно (vy·−0.45), collider-т мөргөвөл буцна. Нохой `mode: 'fetch'` → бөмбөг рүү гүйнэ (stopDist 0.6, sprint); хүрмэгц бөмбөг аманд (head-д attach), `mode: 'return'` → тоглогч руу (stopDist 1.4) → бөмбөгийг урд нь тавина, `happy = 2`, 🎾 бөмбөлөг. Бөмбөг 1 л. Тоглогч бөмбөг дээгүүр алхвал буцаж авна (дараагийн шидэлтэд бэлэн).
- **Өргөх**: `clickAction` нохойг ч сонгоно (`state.pet` үед); `carry` объект `{ m }`-тэй ижил interface-тэй болгохын тулд Dog-д `root`, `update`-тэй тул `carry = { dog: true, root }` салаа: `updateCarry` root-ыг байрлуулж, нохойн сүүл хурдан савчина, ❤️; `putDown`/`throwCarry` (шидвэл нохой богино knock: газарт унаад босно, 😵 → гомдсонгүй, ❤️).
- Илэхэд ❤️ бөмбөлөг (одоогийн interactable дээр нэмнэ).

## F. Хөгжим

`audio.startMusic(mood)` → 4 хувилбар: `town` (одоогийн), `night` (bpm 72, sine, vol 0.06, минор аккорд [0,3,7,10]...), `car` (bpm 124, square+triangle, 2 дахь step бүрд hi-hat noise, bass 8-р ноот), `winter` (bpm 84, triangle 2 октав дээш "хонх", урт dur 1.6·beat, зөөлөн). `setMood(mood)` — ижил бол юу ч хийхгүй; өөр бол хуучныг 0.6с fade, шинийг эхлүүлнэ (crossfade). Runner `runner` хэвээр. TownScene `update`-д: `vehicle ? 'car' : night ? 'night' : season===3 ? 'winter' : 'town'` (night = `dayTime` 0.78–0.22, өдрийн гэрэлтэй ижил босго); 2с-ээс олон солихгүй (debounce).

## G. Photo mode

`src/town/photo.js` `PhotoMode`:
- Орох: `P` / 📷 (дээд баруун icon товч, HUD-д). `scene.photo = true` → `TownScene.update` нь зөвхөн камер/photo update хийнэ (иргэд, амьтад, particle, бөмбөлөг, өдрийн цаг царцана; render үргэлжилнэ). `body.photo` class → CSS-ээр HUD/prompt/minimap/joystick нуугдана; жижиг bar: `📷 Хадгалах · 🔄 Камер дахин · Esc гарах`.
- Камер: одоогийн орбит камераас эхэлж, чирэх = эргүүлэх, дугуй/pinch = zoom (2–30), `WASD`/`QE` = камерын байрлал хөдлөх (харах чиглэлийн дагуу), Shift хурдан. Тоглогчийн дүр хэвээр харагдана.
- Хадгалах: `renderer.render` шууд дуудаад `canvas.toBlob` → `<a download="kagome-city-YYYYMMDD-HHMM.png">`. iOS Safari: `toBlob` дэмжигдэхгүй бол `toDataURL` fallback + шинэ tab.
- Гарах: `Esc`/товч → HUD буцна, камерын хуучин yaw/pitch/dist сэргэнэ.

## H. Утасны гүйцэтгэл

- `app.quality` getter (auto → autoQuality). TownScene `low` үед: trail particle 50%, бөмбөлөг `size·0.9`, иргэдийн `near/lookAt/chat` шалгалт 0.25с тутам (кэш), нугасны threat шалгалт 0.2с тутам, лууван sparkle 1с тутам.
- `?fps` URL параметр → зүүн доод буланд жижиг overlay (FPS median 1с, чанарын түвшин). Хэрэглэгч утсан дээр өөрөө шалгана.
- Automatic quality: одоогийн логик хэвээр (зөвхөн бууруулна).

## Тест

- Vitest (`tests/state.test.js`): `buy/equip/unequip` slot-ууд, `collectCarrot` (давхардал, 20 → done, шагнал нэг удаа), `nextQuestion` level шүүлт + хуучин solved, `ensureRequests`/`fulfillRequest` (inventory дутуу, өдөр солигдох, `done`), DAILY `request`.
- Browser (Playwright, харагдах): маркетын tab бүрээс авах/өмсөх → машин/нохой/trail/гэр дүрслэл; лууван 20 байрлалд хүрэх; хүсэлттэй иргэнтэй ярилцах; бөмбөг шидэх/буцаах; хөгжим солигдох; photo mode PNG; `?fps` overlay.

## Хамрах хүрээнээс гадуур

Runner-ийн өөрчлөлт, онлайн хадгалалт, шинэ NPC/mascot, гэрийн чимэглэлийг чөлөөтэй байрлуулах (тогтмол slot л).
