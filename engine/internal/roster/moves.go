package roster

import "strings"

type Strike struct{ Windup,Active int; W,Y,H float64; Dmg,BK,Ang,MV int }
type ShotDef struct{ Kind string; W,H,VX,VY float64; Bounces,Hold int }

var strikes = map[string]Strike{
	"toque":{2,3,38,-49,10,3,2,-15,0}, "punta":{4,4,70,-58,6,4,3,-19,1},
	"alto":{5,3,49,-80,12,5,4,-65,0}, "bajo":{3,5,54,-13,9,4,4,-38,0},
	"gancho":{5,5,25,-100,58,5,5,-82,2}, "carga":{3,5,43,-55,20,6,5,-25,8},
	"martillo":{8,4,57,-65,27,8,7,-48,0}, "reverso":{3,5,68,-44,10,5,4,-35,0},
	"barrido":{6,5,100,-12,10,6,8,-12,0}, "sarissa":{7,6,172,-54,6,10,7,-20,2},
	"cruce":{1,5,76,-53,9,3,2,-8,15}, "retorno":{1,4,92,-49,8,6,6,-35,0},
}
var shots = map[string]ShotDef{
	"onda":{Kind:"tricolor",W:51,H:12,VX:9,VY:0}, "orbe":{Kind:"orb",W:24,H:24,VX:5,VY:1,Bounces:2,Hold:24},
	"rayo":{Kind:"rayo",W:36,H:7,VX:12,VY:0}, "arco":{Kind:"arco",W:14,H:14,VX:5,VY:-5},
	"suelo":{Kind:"suelo",W:36,H:10,VX:6,VY:0},
}

type MovePhase struct{
	A [2]int
	HB *MoveHB
	Dmg,BK,KS,Ang,MV float64
	Rear bool
	Armor bool
	Beat string
}
type MoveHB struct{ FX,Y,W,H float64 }
type MoveShot struct{ T int; P ShotSpec }
type ShotSpec struct{ FX,Y,W,H,VX,VY float64; Bounces,Hold,Life int; Kind string; Dmg,BK,KS,Ang float64; Back bool }
type MoveSpec struct{
	Name string
	Ph []MovePhase
	Sp []MoveShot
	Dur int
	Effect string
	Pierce bool
}

func ParseMove(name, score string) MoveSpec {
	tick := 0
	var ph []MovePhase
	var sp []MoveShot
	for _, beat := range strings.Fields(score) {
		if beat == "pausa" { tick += 8; continue }
		if sd, ok := shots[beat]; ok {
			tick += 6
			y := -56.0; if beat=="suelo" { y = -10 }
			sp = append(sp, MoveShot{T:tick, P:ShotSpec{FX:18,Y:y,W:sd.W,H:sd.H,VX:sd.VX,VY:sd.VY,Bounces:sd.Bounces,Hold:sd.Hold,Life:90,Kind:sd.Kind,Dmg:6,BK:4,KS:0.13,Ang:-30}})
			continue
		}
		st, ok := strikes[beat]; if !ok { continue }
		tick += st.Windup
		fx := 10.0; if beat=="reverso" || beat=="retorno" { fx = 12 - st.W }
		ph = append(ph, MovePhase{
			A:[2]int{tick, tick+st.Active-1}, HB:&MoveHB{FX:fx,Y:st.Y,W:st.W,H:st.H},
			Dmg:float64(st.Dmg), BK:float64(st.BK), KS:0.12, Ang:float64(st.Ang), MV:float64(st.MV),
			Rear: fx<0, Beat:beat,
		})
		tick += st.Active
	}
	return MoveSpec{Name:name, Ph:ph, Sp:sp, Dur:tick+8}
}
