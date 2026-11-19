import splashAlexander from '../assets/images/alexander_cps1_splash_1795090222670.jpg';
import splashBukele from '../assets/images/bukele_cps1_splash_1795090222950.jpg';
import splashCaesar from '../assets/images/caesar_cps1_splash_1795090222287.jpg';
import splashPetro from '../assets/images/petro_cps1_splash_1795090222099.jpg';
import splashAquiles from '../assets/images/splash_aquiles_1795089714280.jpg';
import splashPulso from '../assets/images/splash_doctora_pulso_1795089714294.jpg';
import splashTrump from '../assets/images/trump_cps1_splash_1795090221395.jpg';
import { resolvePublicAssetUrl } from '../engine/spriteAtlas';

export const FIGHTER_SPLASH_ART: Record<string, string> = {
  bolivar: resolvePublicAssetUrl('assets/aistudio/image_9f4caf54.png'),
  robinson: splashPulso,
  julio_cesar: splashCaesar,
  alejandro_magno: splashAlexander,
  aquiles: splashAquiles,
  bukele: splashBukele,
  petro: splashPetro,
  trump: splashTrump,
};
