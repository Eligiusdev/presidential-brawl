package sim

type StagePlat struct{ X,Y,W,Amp float64 }
type StageDef struct{ ID,Name string; Main struct{X,Y,W,H float64}; Plats []StagePlat }

var stages=[]StageDef{
	{ID:"narino",Name:"Casa de Nariño",Main:struct{X,Y,W,H float64}{400,590,640,78},Plats:[]StagePlat{
		{X:185,Y:455,W:210,Amp:0},
		{X:1045,Y:455,W:210,Amp:0},
		{X:585,Y:335,W:270,Amp:0},
	}},
	{ID:"blanca",Name:"La Casa Blanca",Main:struct{X,Y,W,H float64}{390,590,660,78},Plats:[]StagePlat{
		{X:155,Y:445,W:225,Amp:0},
		{X:1060,Y:445,W:225,Amp:0},
		{X:600,Y:325,W:240,Amp:0},
	}},
	{ID:"miraflores",Name:"Palacio de Miraflores",Main:struct{X,Y,W,H float64}{400,590,640,78},Plats:[]StagePlat{
		{X:205,Y:470,W:195,Amp:0},
		{X:1040,Y:470,W:195,Amp:0},
		{X:465,Y:365,W:185,Amp:0},
		{X:790,Y:365,W:185,Amp:0},
	}},
	{ID:"rosada",Name:"La Casa Rosada",Main:struct{X,Y,W,H float64}{390,590,660,78},Plats:[]StagePlat{
		{X:165,Y:450,W:215,Amp:56},
		{X:1060,Y:450,W:215,Amp:56},
		{X:595,Y:335,W:250,Amp:0},
	}},
	{ID:"planalto",Name:"Palacio de Planalto",Main:struct{X,Y,W,H float64}{380,592,680,76},Plats:[]StagePlat{
		{X:170,Y:470,W:220,Amp:0},
		{X:520,Y:390,W:210,Amp:0},
		{X:880,Y:320,W:210,Amp:0},
		{X:1090,Y:465,W:185,Amp:0},
	}},
	{ID:"mexico",Name:"Palacio Nacional",Main:struct{X,Y,W,H float64}{375,592,690,76},Plats:[]StagePlat{
		{X:175,Y:460,W:205,Amp:0},
		{X:1060,Y:460,W:205,Amp:0},
		{X:470,Y:355,W:200,Amp:0},
		{X:770,Y:355,W:200,Amp:0},
	}},
	{ID:"moneda",Name:"Palacio de La Moneda",Main:struct{X,Y,W,H float64}{395,590,650,78},Plats:[]StagePlat{
		{X:165,Y:455,W:210,Amp:0},
		{X:1065,Y:455,W:210,Amp:0},
		{X:590,Y:310,W:260,Amp:0},
	}},
	{ID:"pizarro",Name:"Palacio de Gobierno",Main:struct{X,Y,W,H float64}{395,590,650,78},Plats:[]StagePlat{
		{X:175,Y:465,W:195,Amp:0},
		{X:1070,Y:465,W:195,Amp:0},
		{X:435,Y:360,W:195,Amp:0},
		{X:810,Y:360,W:195,Amp:0},
		{X:620,Y:255,W:200,Amp:0},
	}},
	{ID:"eliseo",Name:"Palacio del Elíseo",Main:struct{X,Y,W,H float64}{390,590,660,78},Plats:[]StagePlat{
		{X:160,Y:460,W:215,Amp:0},
		{X:1065,Y:460,W:215,Amp:0},
		{X:445,Y:345,W:190,Amp:0},
		{X:805,Y:345,W:190,Amp:0},
	}},
	{ID:"downing",Name:"10 de Downing Street",Main:struct{X,Y,W,H float64}{405,594,630,74},Plats:[]StagePlat{
		{X:170,Y:450,W:205,Amp:0},
		{X:1065,Y:450,W:205,Amp:0},
		{X:595,Y:318,W:250,Amp:0},
	}},
	{ID:"moncloa",Name:"Palacio de La Moncloa",Main:struct{X,Y,W,H float64}{385,590,670,78},Plats:[]StagePlat{
		{X:170,Y:465,W:200,Amp:0},
		{X:1070,Y:465,W:200,Amp:0},
		{X:520,Y:360,W:400,Amp:0},
	}},
	{ID:"kantei",Name:"Kantei (Primer Ministro)",Main:struct{X,Y,W,H float64}{390,594,660,74},Plats:[]StagePlat{
		{X:165,Y:455,W:205,Amp:0},
		{X:590,Y:365,W:260,Amp:38},
		{X:1070,Y:455,W:205,Amp:0},
	}},
}

func StageCount() int { return len(stages) }
func GetStage(i int) StageDef { if i<0||i>=len(stages){i=0}; return stages[i] }

type ArenaGeom struct {
	Main struct{ X,Y,W,H float64 }
	Plats []Platform
	Spawns []struct{ X,Y float64 }
	Blast struct{ L,R,T,B float64 }
}

func ArenaGeometry(stageIdx, capacity int) ArenaGeom {
	s := GetStage(stageIdx)
	scaleW := map[int]float64{2:1,4:1.35,6:1.65,8:2}[capacity]
	scaleH := map[int]float64{2:1,4:1.15,6:1.25,8:1.35}[capacity]
	if scaleW==0 { scaleW=1; scaleH=1 }
	center := s.Main.X + s.Main.W/2
	main := struct{ X,Y,W,H float64 }{center - s.Main.W*scaleW/2, s.Main.Y, s.Main.W*scaleW, s.Main.H}
	width := main.W * 0.23
	yAt := func(level int) float64 { return main.Y - (104+92*float64(level-1))*scaleH }
	symmetric := func(level int, spread, span float64) []Platform {
		return []Platform{{X:center - main.W*spread - span/2, Y:yAt(level), W:span}, {X:center + main.W*spread - span/2, Y:yAt(level), W:span}}
	}
	var plats []Platform
	switch capacity {
	case 2:
		for _,p := range s.Plats { plats = append(plats, Platform{X:p.X, Y:p.Y, W:p.W}) }
	case 4:
		for _,p := range s.Plats { plats = append(plats, Platform{X:center+(p.X-center)*scaleW, Y:main.Y-(main.Y-p.Y)*scaleH, W:p.W}) }
		plats = append(plats, Platform{X:center-width/2, Y:yAt(1), W:width})
	case 6:
		plats = symmetric(1, 0.29, width)
	default: // 8
		plats = append(plats, symmetric(1, 0.34, main.W*0.16)...)
		plats = append(plats, symmetric(2, 0.13, main.W*0.14)...)
	}
	groundCount := capacity; if groundCount>4 { groundCount=4 }
	spawns := make([]struct{X,Y float64}, 0, capacity)
	for i:=0;i<groundCount;i++ { spawns = append(spawns, struct{X,Y float64}{main.X + main.W*float64(i+1)/float64(groundCount+1), main.Y}) }
	if capacity >= 6 {
		extra := capacity-groundCount
		for i:=0;i<extra && i<len(plats);i++ { p:=plats[i]; spawns = append(spawns, struct{X,Y float64}{p.X+p.W/2, p.Y}) }
	}
	blast := struct{ L,R,T,B float64 }{720-900*scaleW, 720+900*scaleW, -260*scaleH, 990*scaleH}
	return ArenaGeom{Main:main, Plats:plats, Spawns:spawns, Blast:blast}
}
