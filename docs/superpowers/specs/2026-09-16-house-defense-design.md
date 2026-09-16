# Байшингийн хаалга → өөр ертөнц: «Хортон хамгаалалт» (эхний байшин) — дизайн

Огноо: 2026-09-16

## Зорилго

Хотын байшин бүр хаалгаараа орж болох "portal" болно; байшин бүр өөр minigame ертөнц. Эхнийх — **Хулууны гэр → Хортон хамгаалалт**: фермийн төв base (аварга хулуу) руу давалгаагаар дайрах царайтай хортон шавьжийг шүүсний бууд (цацуур)-аар буудаж хамгаална; оноогоор хашаа, цацуур цамхаг, хамгаалагч NPC авна; өрөөнийхөнтэй хамт (co-op) тоглож болно. Цус/буу байхгүй — хортон онохоор конфетти болж арилна.

Бусад 4 байшин: хаалга нээгдэж «🔒 Удахгүй нээгдэнэ» (дараагийн ертөнцүүд).

## Бүтэц

```
src/defense/DefenseCore.js   цэвэр логик (Vitest): давалгаа, хортоны хөдөлгөөн/HP, base HP, оноо/зоос, дэлгүүр, байгууламж, цацуур/хамгаалагчийн авто-буудалт
src/defense/DefenseScene.js  scene (RunnerScene-тэй ижил API: enter/exit/update/render/resize/buildAvatar): дүрслэл, тоглогчийн хөдөлгөөн/буудалт, камер, HUD, дэлгүүр UI, co-op
src/defense/defenseWorld.js  procedural ертөнц: шөнийн ферм, base хулуу, хашааны slot, 4 spawn зам, талбай, гэрэл
src/defense/pests.js         хортоны mascot-ууд (хорхой, хэрээ, номин, слайм) + анимаци
```

TownScene: байшин бүрд хаалганы interactable (`🚪 <нэр> руу орох`), ойртоход хаалга нээгдэнэ (`userData.door` mesh rotation.y), орохдоо `app.switchTo('defense')`; гарахад хаалганы урд буцна.

## Core (логик)

- `DefenseCore({ rand })`: `base = { hp: 100, max: 100 }`, `wave = 0`, `phase: 'prep'|'wave'|'over'`, `prepT` (15с; 'Эхлэх' дарж алгасна), `coins`, `score`, `pests: [{ id, type, x, z, hp, speed, target, slow }]`, `structures: [{ id, kind, slot, hp }]`, `guards: [{ id, x, z, cd }]`, `shots: []` (цацуур/хамгаалагчийн онолт — Scene дүрсэлнэ).
- Хортон: `WORM` (hp 2, speed 1.6, +10), `CROW` (hp 1, speed 3.4, нисдэг — хашаа давна, +12), `MOLE` (hp 3, speed 1.2, base-аас 8м-т газраас гарна, +15), `SLIME` (hp 5, speed 1.0, +20; үхэхэд 2 жижиг слайм hp 1). Давалгаа N: тоо `4 + 2N`, төрлийн хувь N-ээс хамаарна (1–2: worm; 3+: crow; 5+: mole; 7+: slime), spawn 4 талын замаас санамсаргүй, 0.8с интервал.
- Хөдөлгөөн: base (0,0) руу шулуун; хашааны slot (радиус 7) дээгүүр өнгөрөхөд хашаа байвал зогсоод хашааг хазна (hp −1/с), эвдэрвэл үргэлжилнэ (CROW дайрахгүй). Base-д (радиус 2.2) хүрвэл base −4, хортон арилна (оноо −0).
- Тоглогч буудалт: `shoot(x, z, dirX, dirZ)` → Core `hitTest` (шулуун 14м, өргөн 0.8; эхний хортон) → hp −1 (`power` upgrade → −2); үхвэл `coins += reward; score += reward`; конфетти event.
- Дэлгүүр (prep үед л): `FENCE` 50 (slot дараалалд, hp 30), `SPRAYER` 120 (slot, радиус 8, 1 сум/0.9с, dmg 1), `GUARD` 150 (mascot, base эргэн тойрон явж 7м-т буудна, 1/0.7с), `POWER` 80 (тоглогчийн dmg 2, дараа нь fire rate ×1.4; 2 түвшин), `REPAIR` 40 (base +30). 8 slot: `slot i` → өнцөг i·45°, радиус 7 (FENCE) / радиус 4.5 (SPRAYER). Худалдан авалт автоматаар дараагийн чөлөөт slot-д.
- Давалгаа дуусахад (бүх хортон арилсан) → `wave++`, `phase='prep'`, `coins += 20 + 5·wave` (бонус). Base hp 0 → `phase='over'`: `stars = floor(score / 25)`, `state.defense = { best: max score, wavesBest }` (шинэ талбар), `counts.defense++`.
- `tick(dt)` бүгдийг нэг дор; `events[]` (spawn/die/hit/baseHit/waveStart/over) → Scene уншиж цэвэрлэнэ.

## Scene

- Шөнийн ферм: харанхуй тэнгэр, сар, base хулуу (аварга, glow, HP-аар царай өөрчлөгдөнө: 😊→😟→😱), 4 талд замын мөр, хашааны slot-ууд (бүдэг тойрог), дэнлүү. Fog 40м.
- Тоглогч: хотын дүр (`createAvatar` + хувцас), WASD/joystick камерын чиглэлээр (алхах 5.6/гүйх 9.4), 30м радиус талбай; үсрэлтгүй. Камер: хотын орбит камер (yaw чирэх).
- Буудалт: **авто чиглүүлэлт** — 14м доторх хамгийн ойрын хортон руу дүр эргэнэ; `E`/Space/actionBtn/дэлгэц товшилт → шүүсний бөмбөлөг (ногоон-улбар шар сфер, 22 м/с, бага нуман) → онолт `Core.shoot`; дүрслэл: цацуур гарт (цилиндр + сав), сум, онохоор splash + конфетти burst + "squish" дуу.
- HUD (`#defHud`): ❤️ base HP bar, 🌊 давалгаа N, 🧃 зоос, ⭐ оноо, хортон үлдсэн; prep үед том «Дэлгүүр» цонх (5 карт + «Давалгаа эхлэх ▶» + prep countdown); over үед үр дүн (оноо, давалгаа, од) + «Дахин» / «Хот руу».
- Утас: joystick + actionBtn = буудах (E), 🏃 гүйх; prompt-гүй.
- Хортон: `pests.js` mascot маягийн бөөрөнхий бие + царай (муруу нүд, шүд), төрөл бүр өнгө/хэлбэр: хорхой (ногоон сегмент 3), хэрээ (хар, далавч дэвэлт, y 2.5), номин (бор, нүхнээс гарах анимаци), слайм (нил, тултах). Хөдөлгөөн Core-оос, анимаци Scene-д.
- Цацуур цамхаг: сав + хошуу, эргэнэ, сум гаргана. Хамгаалагч: `Mascot` (broccoli/carrot) цацууртай, Core `guards` байрлал.

## Хот ↔ байшин

- Байшин бүр (`houseDefs` 5): хаалганы дэргэд interactable (`x,z` = орцны урд, r 2.6): Хулууны гэр → `enterDefense()`; бусад → хаалга нээгдэж toast «🔒 <нэр> удахгүй нээгдэнэ». `props.fruitHouse` хаалганы mesh-д `userData.door = true`, `g.userData.doorPos` (дэлхийн байрлал); TownScene ойртоход (3.5м) `rotation.y` → −1.6 (зөөлөн), холдоход буцна.
- `enterDefense()`: `app.switchTo('defense')` (fade); DefenseScene `enter()` → шинэ session (эсвэл co-op-д нэгдэнэ). Гарах → `switchTo('town')`, тоглогч хаалганы урд.

## Co-op (өрөөнд байхад)

- Байшинд орсон тоглогч `state`-даа `house: 'defense'` (proto: `runner` талбарыг `zone` болгоно: 0 хот, 1 runner, 2 defense). Хотынхонд харагдахгүй; байшинд байгаа бусад нь харагдана (DefenseScene өөрийн `RemotePlayers`-той — `remote.js`-ийг scene параметртэй болгож дахин ашиглана).
- Session host = байшинд хамгийн эрт орсон (`defJoinedAt`); host `DefenseCore`-ийг ажиллуулж 10Hz `def` суваг (`defense` action): `{ phase, wave, prepT, base, coins, score, pests: [[id,type,x,z,hp]], structures, guards }` түгээнэ; guest Core-гүй, зөвхөн дүрсэлнэ + interpolate.
- Guest буудах: локал сум дүрслэл + `defShot {x,z,dx,dz}` event → host `Core.shoot`; host үхлийн event → бүгдэд конфетти. Guest дэлгүүр: `defBuy {kind}` → host. Prep «Эхлэх» — host л дарна (guest-д «host хүлээж байна»). Зоос/оноо багийнх (нэг). Дууссаны од: хүн бүр `stars += floor(score/25)` (өөрийн save).
- Host гарвал (байшингаас/өрөөнөөс) → дараагийн эрт орсон нь host болж Core-оо сүүлийн snapshot-оос үргэлжлүүлнэ (`Core.load(snapshot)`).

## Тест

- Vitest `tests/defense.test.js`: давалгааны тоо/төрөл, хортон base-д хүрэхэд hp, хашаа зогсоох/эвдэх, `shoot` онолт + reward, дэлгүүр (зоос дутуу, slot дүүрэн), цацуурын авто-буудалт, over + од тооцоо, `snapshot/load` round-trip.
- Browser: хаалга нээгдэх/орох, 3 давалгаа тоглох (auto-aim, дэлгүүр), утасны товч; 2 tab co-op (host/guest буудах, дэлгүүр, host солигдох).
