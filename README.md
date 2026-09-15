# Kagome City — Жимсний хот 🍎🥕

Kagome брэндийн 3D боловсролын тоглоом: жимсний хотоор чөлөөтэй аялж, жимс түүж, тоо бодох / унших / логикийн сорил давж, жимсэн машин жолоодож, ширэнгээр гүйнэ (Jungle Runner).

Бүх дүрслэл procedural (Three.js) — гадны 3D модел, texture файл ашиглаагүй. Зөвхөн Kagome бүтээгдэхүүний 8 зураг (WebP).

## Ажиллуулах

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ хавтас — статик хостинг (Vercel, GitHub Pages, Netlify)
npm run preview
npm test           # GameState unit test (Vitest)
```

## Онцлог

- **Жимсний хот** — 6 бүлэгт аялал (жимс түүх, тоо бодох, унших, логик, машин, гүйлт), 10 mascot дүр + хувцас (Kagome маркет), шүүсний лаборатори mini-game, өдрийн даалгавар, жимс дахин ургах
- **Хотын activity** — 🎣 загас барих (сувгийн эрэг, timing), 🌱 миний талбай (үр авах → тарих → услах → хураах, реал цаг), 📬 хүргэлтийн даалгавар (захиалгын самбараас хугацаатай, машинаар хурдан)
- **Амьд хот** — алхдаг иргэд, тариаланч, худалдагч, загасчин, дагадаг нохой (Луувсай), нугас, муур, эрвээхий, шувуу; өдөр-шөнө, бороо/солонго, 4 улирал (5 мин тутам)
- **Jungle Runner** — 5 үе + төгсгөлгүй горим, power-up (бамбай, соронз, jetpack, ×2), рекордын самбар
- **Дүрслэл** — toon shading, дугуй хязгаар, lens flare, depth of field, contact shadow, particle, procedural texture

## Удирдлага

| Үйлдэл | Гар | Утас / Gamepad |
|---|---|---|
| Алхах | `W A S D` / сум | Зүүн joystick |
| Гүйх | `Shift` | 🏃 товч / joystick бүтэн |
| Үсрэх | `Space` | ↑ товч / A |
| Харилцах, машинд суух/буух | `E` | E товч / B |
| Камер | Хулгана чирэх, `Q`/`R` | Дэлгэц чирэх / баруун stick |
| Газрын зураг | `M` | 🗺 |
| Цэс | `Esc` | ⏸ |
| Давхар үсрэлт / өнхрөх | `Space ×2` / `C` | ↑↑ / 🔄 |
| Emote | `1` `2` `3` | — |
| Zoom | Хулганы дугуй | Хоёр хуруу |

**Jungle Runner:** `← →` эгнээ, `↑` үсрэх, `↓` гулсах (агаарт — шумбах), `E` уяанаас зүүгдэх. Утсан дээр шудрах.

## Бүтэц

```
src/
  main.js              эхлүүлэгч, горим солилт, автомат чанар
  core/    content.js  агуулга (жимс, аялал, асуулт, бүтээгдэхүүн, түвшин)
           state.js    ахиц (localStorage)
           input.js    гар / мэдрэгч / gamepad нэгдсэн удирдлага
           audio.js    procedural дуу, хөгжим, ambient
           ui.js       toast, modal, HUD туслахууд
  gfx/     materials.js toon shading, outline, ус, салхи shader
           textures.js  canvas texture (өвс, зам, мод, нүүр...)
           sky.js       тэнгэрийн градиент, үүл
           post.js      bloom + vignette
           particles.js instanced particle
           merge.js     статик mesh нэгтгэл (draw call оновчлол)
  world/   character.js chibi дүр + animation state machine
           props.js     мод, байшин, хашаа, машин, бүтээгдэхүүн...
           town.js      хотын байршил, collider
  town/    TownScene.js хотын gameplay (хөдөлгөөн, камер, машин, аялал, minimap)
           juice.js     шүүсний лаборатори mini-game
           fishing.js   загас барих (3D timing)
           farm.js      миний талбай (тарих/услах/хураах)
           delivery.js  хүргэлтийн даалгавар + HUD
  runner/  RunnerCore.js runner логик (дүрслэлгүй)
           RunnerScene.js runner дүрслэл, камер, эффект
```

## Хадгалалт

Ахиц `localStorage` дээр `kagome-city-v2` түлхүүрээр хадгалагдана. Цэсний "Ахиц устгах" товчоор цэвэрлэнэ.
