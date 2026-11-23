package sim

import (
	"crypto/rand"
	"encoding/binary"
)

var fighterIDs = []string{
	"washington", "lincoln", "teddy", "fdr", "eisenhower", "kennedy", "bolivar", "sanmartin",
	"juarez", "cardenas", "ohiggins", "sarmiento", "alfaro", "batlle", "vargas", "kubitschek",
	"allende", "sucre", "artigas", "mujica", "degaulle", "mitterrand", "chirac", "masaryk",
	"havel", "walesa", "pertini", "kekkonen", "robinson", "mandela", "sankara", "nkrumah",
	"nyerere", "ataturk", "sunyatsen", "kalam", "cesar", "alejandro", "aquiles", "lula",
	"juana", "espartaco", "musashi", "policarpa", "wallace", "elcid", "ricaurte", "simo",
	"abelardo", "petro", "uribe", "santos", "duque", "bukele", "sheinbaum", "milei",
	"trump", "macron", "noboa", "kast", "biden", "maduro", "putin", "obama",
	"napoleon", "antoinette", "bathory", "xiomara", "diazcanel", "ortega", "gengis",
}

func FighterIDs() []string { return fighterIDs }
func StageCount() int      { return 12 }

func RandomSeed() uint32 {
	var b [4]byte
	_, _ = rand.Read(b[:])
	s := binary.LittleEndian.Uint32(b[:]) & 0x7fffffff
	if s == 0 {
		s = 1
	}
	return s
}
