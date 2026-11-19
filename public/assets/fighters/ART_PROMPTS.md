# Prompts de arte pendientes — resto del roster

Estilo común (idéntico al de Aquiles y Washington): pixel art CPS-1 de lucha arcade, vista lateral mirando a la DERECHA, luz clave arriba-izquierda, contorno oscuro cromático, proporciones adultas de ~6 cabezas, fondo magenta plano #FF00FF (sin sombras ni degradados), 25 poses en cuadrícula 5x5, mismo personaje, misma escala y mismo arma en la misma mano en todas las poses.

Orden de poses (lectura izquierda→derecha, arriba→abajo):

```
 0 guardia A      1 guardia B (puño adelante)  2 caminar contacto  3 caminar paso  4 caminar zancada
 5 correr          6 agachado                   7 salto subiendo    8 salto cerrado 9 caída
10 agachado ataque 11 ataque ligero preparación  12 ataque ligero estocada 13 ataque ligero corte/impacto 14 daño
15 especial preparación 16 especial impacto largo 17 especial ascendente 18 especial bajo/deslizada 19 recuperación
20 de rodillas (derrota 1) 21 caído (derrota 2) 22 guardia neutra 23 victoria A 24 victoria B
```

Después: añade `tools/fighters/<id>.json` (copia `washington.json`) y ejecuta `python3 tools/build_atlas.py tools/fighters/<id>.json`; luego registra el id en `FIGHTER_ATLAS_REGISTRY`.

---

## Abraham Lincoln (`lincoln`)
- Rol: Alcance Pesado · Era: 1861–1865
- Piel #dba77f · traje #1a1c24 · acento #c94338 · cabello #221c18 · capa #16171f
- Arma: axe · vestuario: suit · cabeza/pelo: tophat · faja/corbata: black_tie
- Especial: Golpe de Emancipación (quake) · Ultimate: Expreso de la Unión
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Abraham Lincoln** (Alcance Pesado), traje #1a1c24, acentos #c94338, arma axe, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Theodore Roosevelt (`teddy`)
- Rol: Brawler Blindado · Era: 1901–1909
- Piel #e7b58d · traje #4a3d2d · acento #d97706 · cabello #5c4028 · capa —
- Arma: gloves · vestuario: tactical · cabeza/pelo: fedora · faja/corbata: tactical
- Especial: Carga de San Juan (breaker) · Ultimate: Fuerza del Big Stick
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Theodore Roosevelt** (Brawler Blindado), traje #4a3d2d, acentos #d97706, arma gloves, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Franklin D. Roosevelt (`fdr`)
- Rol: Guardián Estratégico · Era: 1933–1945
- Piel #f0b68a · traje #222c42 · acento #3b82f6 · cabello #cbd5e1 · capa #192236
- Arma: gavel · vestuario: suit · cabeza/pelo: grey_short · faja/corbata: red_tie
- Especial: Escudo del New Deal (wall) · Ultimate: Bastión de las Cuatro Libertades
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Franklin D. Roosevelt** (Guardián Estratégico), traje #222c42, acentos #3b82f6, arma gavel, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Dwight D. Eisenhower (`eisenhower`)
- Rol: Táctico Equilibrado · Era: 1953–1961
- Piel #e7b58d · traje #2f3d32 · acento #eab308 · cabello #d1d5db · capa —
- Arma: baton · vestuario: gala · cabeza/pelo: cap · faja/corbata: medal_sash
- Especial: Perímetro Aliado (bars) · Ultimate: Operación Estratégica
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Dwight D. Eisenhower** (Táctico Equilibrado), traje #2f3d32, acentos #eab308, arma baton, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## John F. Kennedy (`kennedy`)
- Rol: Zoner Ágil · Era: 1961–1963
- Piel #f0b68a · traje #1e3068 · acento #38bdf8 · cabello #6b4226 · capa —
- Arma: staff · vestuario: suit · cabeza/pelo: combover · faja/corbata: red_tie
- Especial: Pulso Apolo (pulse) · Ultimate: Ignición Lunar
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **John F. Kennedy** (Zoner Ágil), traje #1e3068, acentos #38bdf8, arma staff, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Donald Trump (`trump`)
- Rol: Brawler Blindado · Aura Áurea · Era: 2017–2021 · 2025–
- Piel #e8aa7b · traje #162952 · acento #ef4444 · cabello #f2c144 · capa —
- Arma: gloves · vestuario: suit · cabeza/pelo: combover · faja/corbata: red_tie
- Especial: Executive Strike (breaker) · Ultimate: Tormenta Ejecutiva
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Donald Trump** (Brawler Blindado · Aura Áurea), traje #162952, acentos #ef4444, arma gloves, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Simón Bolívar (`bolivar`)
- Rol: Espadachín Ágil · Era: 1819–1830
- Piel #dca77f · traje #1d3a82 · acento #f0c43c · cabello #5a3a22 · capa #b01e28
- Arma: saber · vestuario: gala · cabeza/pelo: bicorne_hair · faja/corbata: gold_sash
- Especial: Carga de los Andes (fencing) · Ultimate: Tormenta Tricolor
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Simón Bolívar** (Espadachín Ágil), traje #1d3a82, acentos #f0c43c, arma saber, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## José de San Martín (`sanmartin`)
- Rol: Maestro de Esgrima · Era: 1821–1822
- Piel #e2ac84 · traje #1a2d5e · acento #60a5fa · cabello #2b1e16 · capa #14224a
- Arma: saber · vestuario: gala · cabeza/pelo: bicorne_hair · faja/corbata: gold_sash
- Especial: Estocada de Maipú (fencing) · Ultimate: Carga de Granaderos
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **José de San Martín** (Maestro de Esgrima), traje #1a2d5e, acentos #60a5fa, arma saber, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Benito Juárez (`juarez`)
- Rol: Guardián Constitucional · Era: 1858–1872
- Piel #b87c54 · traje #181a22 · acento #22c55e · cabello #14151a · capa —
- Arma: gavel · vestuario: suit · cabeza/pelo: grey_short · faja/corbata: tricolor_sash
- Especial: Balanza de la Reforma (wall) · Ultimate: Monumento de la Ley
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Benito Juárez** (Guardián Constitucional), traje #181a22, acentos #22c55e, arma gavel, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Lázaro Cárdenas (`cardenas`)
- Rol: Zoner Energético · Era: 1934–1940
- Piel #c98e64 · traje #2c3242 · acento #10b981 · cabello #1f1b18 · capa #202636
- Arma: staff · vestuario: suit · cabeza/pelo: combover · faja/corbata: tricolor_sash
- Especial: Pulso Soberano (pulse) · Ultimate: Tormenta Energética
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Lázaro Cárdenas** (Zoner Energético), traje #2c3242, acentos #10b981, arma staff, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## — (`ohiggins`)
- Rol: Espadachín Veloz · Era: 1817–1823
- Piel #e5b38b · traje #1d366b · acento #dc2626 · cabello #5c331c · capa #172952
- Arma: saber · vestuario: gala · cabeza/pelo: bicorne_hair · faja/corbata: medal_sash
- Especial: Carga de Rancagua (fencing) · Ultimate: Abanico Austral
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **—** (Espadachín Veloz), traje #1d366b, acentos #dc2626, arma saber, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Domingo F. Sarmiento (`sarmiento`)
- Rol: Táctico Ilustrado · Era: 1868–1874
- Piel #e7b58d · traje #262b38 · acento #38bdf8 · cabello #cbd5e1 · capa —
- Arma: staff · vestuario: suit · cabeza/pelo: grey_short · faja/corbata: gold_sash
- Especial: Faro Educativo (pulse) · Ultimate: Luminaria de los Andes
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Domingo F. Sarmiento** (Táctico Ilustrado), traje #262b38, acentos #38bdf8, arma staff, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Eloy Alfaro (`alfaro`)
- Rol: Vanguardia Ferroviaria · Era: 1895–1911
- Piel #d9a47b · traje #1f2937 · acento #f59e0b · cabello #e2e8f0 · capa #18202c
- Arma: axe · vestuario: gala · cabeza/pelo: grey_short · faja/corbata: gold_sash
- Especial: Martillo del Ferrocarril (quake) · Ultimate: Locomotora Trasandina
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Eloy Alfaro** (Vanguardia Ferroviaria), traje #1f2937, acentos #f59e0b, arma axe, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## José Batlle y Ordóñez (`batlle`)
- Rol: Estratega Cívico · Era: 1903–1915
- Piel #e7b58d · traje #1d222e · acento #60a5fa · cabello #94a3b8 · capa —
- Arma: gavel · vestuario: suit · cabeza/pelo: combover · faja/corbata: black_tie
- Especial: Escudo Republicano (bars) · Ultimate: Sello Constitucional
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **José Batlle y Ordóñez** (Estratega Cívico), traje #1d222e, acentos #60a5fa, arma gavel, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Getúlio Vargas (`vargas`)
- Rol: Tanque Industrial · Era: 1930–1954
- Piel #e0ab82 · traje #272c38 · acento #22c55e · cabello #475569 · capa #1b1f29
- Arma: gavel · vestuario: suit · cabeza/pelo: combover · faja/corbata: gold_sash
- Especial: Muralla de Acero (wall) · Ultimate: Torre Siderúrgica
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Getúlio Vargas** (Tanque Industrial), traje #272c38, acentos #22c55e, arma gavel, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Juscelino Kubitschek (`kubitschek`)
- Rol: Zoner Arquitectónico · Era: 1956–1961
- Piel #e5b38b · traje #253554 · acento #facc15 · cabello #1f2937 · capa —
- Arma: staff · vestuario: suit · cabeza/pelo: combover · faja/corbata: yellow_tie
- Especial: Arco de Brasilia (pulse) · Ultimate: Haces de la Alvorada
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Juscelino Kubitschek** (Zoner Arquitectónico), traje #253554, acentos #facc15, arma staff, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Salvador Allende (`allende`)
- Rol: Brawler Firme · Era: 1970–1973
- Piel #e5b38b · traje #2a2f3d · acento #e11d48 · cabello #cbd5e1 · capa —
- Arma: baton · vestuario: suit · cabeza/pelo: grey_short · faja/corbata: tricolor_sash
- Especial: Firmeza Cívica (breaker) · Ultimate: Onda de las Alamedas
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Salvador Allende** (Brawler Firme), traje #2a2f3d, acentos #e11d48, arma baton, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Antonio José de Sucre (`sucre`)
- Rol: Esgrimista Preciso · Era: 1825–1828
- Piel #e2ac84 · traje #1d3266 · acento #facc15 · cabello #3a2616 · capa #15254d
- Arma: saber · vestuario: gala · cabeza/pelo: bicorne_hair · faja/corbata: medal_sash
- Especial: Duelo de Ayacucho (fencing) · Ultimate: Filo del Mariscal
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Antonio José de Sucre** (Esgrimista Preciso), traje #1d3266, acentos #facc15, arma saber, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## José Gervasio Artigas (`artigas`)
- Rol: Jinete de Frontera · Era: 1815–1820
- Piel #dfa77d · traje #1e2c4d · acento #ef4444 · cabello #3b2c22 · capa #7f1d1d
- Arma: saber · vestuario: gala · cabeza/pelo: fedora · faja/corbata: tricolor_sash
- Especial: Sable Oriental (uppercut) · Ultimate: Caudal del Plata
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **José Gervasio Artigas** (Jinete de Frontera), traje #1e2c4d, acentos #ef4444, arma saber, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## José Mujica (`mujica`)
- Rol: Contragolpe Sereno · Era: 2010–2015
- Piel #e5b38b · traje #374151 · acento #38bdf8 · cabello #d1d5db · capa —
- Arma: axe · vestuario: robe · cabeza/pelo: grey_short · faja/corbata: tactical
- Especial: Arado de la Tierra (quake) · Ultimate: Fuerza Serena
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **José Mujica** (Contragolpe Sereno), traje #374151, acentos #38bdf8, arma axe, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Nayib Bukele (`bukele`)
- Rol: Zoner Digital · Crypto Blast · Era: 2019–Actual
- Piel #dfa77d · traje #1a202e · acento #38bdf8 · cabello #18181b · capa —
- Arma: gloves · vestuario: suit · cabeza/pelo: backward_cap · faja/corbata: tactical
- Especial: Crypto Blast (pulse) · Ultimate: Red Relámpago
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Nayib Bukele** (Zoner Digital · Crypto Blast), traje #1a202e, acentos #38bdf8, arma gloves, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Gustavo Petro (`petro`)
- Rol: Control Elemental · Onda Andina · Era: 2022–Actual
- Piel #e0ab82 · traje #192130 · acento #22c55e · cabello #272320 · capa —
- Arma: gloves · vestuario: suit · cabeza/pelo: combover · faja/corbata: tricolor_sash
- Especial: Andean Gust (pulse) · Ultimate: Tormenta de los Andes
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Gustavo Petro** (Control Elemental · Onda Andina), traje #192130, acentos #22c55e, arma gloves, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Charles de Gaulle (`degaulle`)
- Rol: Estratega Alto · Era: 1959–1969
- Piel #f0b68a · traje #2a3428 · acento #3b82f6 · cabello #9ca3af · capa —
- Arma: baton · vestuario: gala · cabeza/pelo: cap · faja/corbata: medal_sash
- Especial: Línea Estratégica (bars) · Ultimate: Bastión de París
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Charles de Gaulle** (Estratega Alto), traje #2a3428, acentos #3b82f6, arma baton, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## François Mitterrand (`mitterrand`)
- Rol: Duelista Elegante · Era: 1981–1995
- Piel #f0b68a · traje #1f2433 · acento #ef4444 · cabello #cbd5e1 · capa #161a26
- Arma: gavel · vestuario: robe · cabeza/pelo: fedora · faja/corbata: bowtie
- Especial: Golpe Diplomático (tiger) · Ultimate: Arco del Triunfo
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **François Mitterrand** (Duelista Elegante), traje #1f2433, acentos #ef4444, arma gavel, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Jacques Chirac (`chirac`)
- Rol: Tanque Diplomático · Era: 1995–2007
- Piel #f0b68a · traje #1e293b · acento #2563eb · cabello #d1d5db · capa —
- Arma: gavel · vestuario: suit · cabeza/pelo: grey_short · faja/corbata: red_tie
- Especial: Escudo del Elíseo (wall) · Ultimate: Columna Republicana
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Jacques Chirac** (Tanque Diplomático), traje #1e293b, acentos #2563eb, arma gavel, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Tomáš G. Masaryk (`masaryk`)
- Rol: Sabio Táctico · Era: 1918–1935
- Piel #f0b68a · traje #262b38 · acento #38bdf8 · cabello #e5e7eb · capa #1c202b
- Arma: staff · vestuario: suit · cabeza/pelo: grey_short · faja/corbata: bowtie
- Especial: Luz de Praga (pulse) · Ultimate: Tormenta Bohemia
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Tomáš G. Masaryk** (Sabio Táctico), traje #262b38, acentos #38bdf8, arma staff, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Václav Havel (`havel`)
- Rol: Ágil Evasivo · Era: 1989–2003
- Piel #f7cbb2 · traje #2e3342 · acento #a855f7 · cabello #94a3b8 · capa —
- Arma: claws · vestuario: leather · cabeza/pelo: combover · faja/corbata: tactical
- Especial: Impulso Terciopelo (tiger) · Ultimate: Vuelo de Praga
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Václav Havel** (Ágil Evasivo), traje #2e3342, acentos #a855f7, arma claws, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Lech Wałęsa (`walesa`)
- Rol: Brawler Industrial · Era: 1990–1995
- Piel #f0b68a · traje #232836 · acento #ef4444 · cabello #9ca3af · capa —
- Arma: gloves · vestuario: suit · cabeza/pelo: grey_short · faja/corbata: red_tie
- Especial: Golpe Solidario (breaker) · Ultimate: Onda de Gdańsk
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Lech Wałęsa** (Brawler Industrial), traje #232836, acentos #ef4444, arma gloves, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Sandro Pertini (`pertini`)
- Rol: Duelista Tenaz · Era: 1978–1985
- Piel #e7b58d · traje #222838 · acento #22c55e · cabello #e2e8f0 · capa #191f2b
- Arma: baton · vestuario: suit · cabeza/pelo: grey_short · faja/corbata: tricolor_sash
- Especial: Firmeza Alpina (tiger) · Ultimate: Embestida Tricolor
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Sandro Pertini** (Duelista Tenaz), traje #222838, acentos #22c55e, arma baton, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Urho Kekkonen (`kekkonen`)
- Rol: Atleta Equilibrado · Era: 1956–1982
- Piel #f7cbb2 · traje #1e304d · acento #38bdf8 · cabello #d1d5db · capa —
- Arma: axe · vestuario: tactical · cabeza/pelo: grey_short · faja/corbata: tactical
- Especial: Salto Nórdico (quake) · Ultimate: Expreso Polar
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Urho Kekkonen** (Atleta Equilibrado), traje #1e304d, acentos #38bdf8, arma axe, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Mary Robinson (`robinson`)
- Rol: Mística Tecnológica · Zoner · Era: 1990–1997
- Piel #f4c5a8 · traje #4c2b78 · acento #18d48c · cabello #4a2c1a · capa #23163b
- Arma: staff · vestuario: suit · cabeza/pelo: ponytail · faja/corbata: gold_sash
- Especial: Faro de Dublín (pulse) · Ultimate: Aurora Celta
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Mary Robinson** (Mística Tecnológica · Zoner), traje #4c2b78, acentos #18d48c, arma staff, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Nelson Mandela (`mandela`)
- Rol: Brawler Blindado · Era: 1994–1999
- Piel #784d36 · traje #d9842b · acento #2aa662 · cabello #d4d8e0 · capa —
- Arma: gloves · vestuario: armored · cabeza/pelo: grey_short · faja/corbata: medal_sash
- Especial: Rompecadenas (breaker) · Ultimate: Espíritu de Invictus
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Nelson Mandela** (Brawler Blindado), traje #d9842b, acentos #2aa662, arma gloves, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Thomas Sankara (`sankara`)
- Rol: Veloz Táctico · Era: 1983–1987
- Piel #6e422c · traje #3f4a34 · acento #ef4444 · cabello #171717 · capa —
- Arma: baton · vestuario: tactical · cabeza/pelo: beret · faja/corbata: tactical
- Especial: Avance Íntegro (fencing) · Ultimate: Relámpago del Sahel
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Thomas Sankara** (Veloz Táctico), traje #3f4a34, acentos #ef4444, arma baton, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Kwame Nkrumah (`nkrumah`)
- Rol: Zoner Solar · Era: 1960–1966
- Piel #6e422c · traje #1e293b · acento #facc15 · cabello #18181b · capa #164e3f
- Arma: staff · vestuario: robe · cabeza/pelo: grey_short · faja/corbata: gold_sash
- Especial: Pulso Estrella Negra (pulse) · Ultimate: Alba Panafricana
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Kwame Nkrumah** (Zoner Solar), traje #1e293b, acentos #facc15, arma staff, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Julius Nyerere (`nyerere`)
- Rol: Guardián Comunitario · Era: 1964–1985
- Piel #784d36 · traje #293241 · acento #22c55e · cabello #d1d5db · capa —
- Arma: gavel · vestuario: suit · cabeza/pelo: grey_short · faja/corbata: tricolor_sash
- Especial: Bastión Ujamaa (wall) · Ultimate: Cumbre del Kilimanjaro
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Julius Nyerere** (Guardián Comunitario), traje #293241, acentos #22c55e, arma gavel, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Mustafa Kemal Atatürk (`ataturk`)
- Rol: Espadachín Estratégico · Era: 1923–1938
- Piel #e5b38b · traje #1f2937 · acento #e11d48 · cabello #b48a4e · capa #171f2b
- Arma: saber · vestuario: gala · cabeza/pelo: combover · faja/corbata: medal_sash
- Especial: Sable de Anatolia (fencing) · Ultimate: Tormenta de Ankara
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Mustafa Kemal Atatürk** (Espadachín Estratégico), traje #1f2937, acentos #e11d48, arma saber, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Sun Yat-sen (`sunyatsen`)
- Rol: Duelista Ilustrado · Era: 1912
- Piel #e7b58d · traje #273043 · acento #3b82f6 · cabello #1f2937 · capa —
- Arma: saber · vestuario: suit · cabeza/pelo: combover · faja/corbata: tactical
- Especial: Guardia Republicana (fencing) · Ultimate: Dragón de Cantón
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Sun Yat-sen** (Duelista Ilustrado), traje #273043, acentos #3b82f6, arma saber, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## A. P. J. Abdul Kalam (`kalam`)
- Rol: Artillero Espacial · Era: 2002–2007
- Piel #965c3e · traje #1e3068 · acento #fb923c · cabello #d1d5db · capa —
- Arma: staff · vestuario: suit · cabeza/pelo: wild · faja/corbata: gold_sash
- Especial: Pulso Aeroespacial (pulse) · Ultimate: Tormenta Orbital
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **A. P. J. Abdul Kalam** (Artillero Espacial), traje #1e3068, acentos #fb923c, arma staff, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Julio César (`julio_cesar`)
- Rol: Presión Cercana · Rushdown · Era: 49–44 a.C.
- Piel #e5b38b · traje #8c1d24 · acento #f2c144 · cabello #64748b · capa #b91c1c
- Arma: saber · vestuario: armored · cabeza/pelo: laurel · faja/corbata: gold_sash
- Especial: Gladius Voraz (fencing) · Ultimate: Triunfo del Senado
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Julio César** (Presión Cercana · Rushdown), traje #8c1d24, acentos #f2c144, arma saber, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*

## Alejandro Magno (`alejandro_magno`)
- Rol: Rango Medio · Kopis & Sarissa · Era: 336–323 a.C.
- Piel #ecc098 · traje #b67d2d · acento #38bdf8 · cabello #78350f · capa #1d4ed8
- Arma: spear · vestuario: armored · cabeza/pelo: plumed_helmet · faja/corbata: medal_sash
- Especial: Estocada de Caballería (fencing) · Ultimate: Falange Invencible
- Prompt: *Hoja de sprites pixel art CPS-1, 25 poses 5x5, fondo magenta, luchador **Alejandro Magno** (Rango Medio · Kopis & Sarissa), traje #b67d2d, acentos #38bdf8, arma spear, rostro y vestuario fieles a su ilustración de selección; poses en el orden indicado arriba.*
