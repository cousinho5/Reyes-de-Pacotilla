// Bots con personalidad. Juegan con lo mismo que vería una persona (sus
// casillas, las vecinas y el Prestigio público) y deciden por valoración:
// cuánto vale cada recurso para ellos, qué casillas compensa atacar, cuándo
// apoyar, cuándo defender, qué construir y con quién comerciar.
// Son puros y deterministas, como el resto del motor.

export { BOT_TWEAKS, PERSONALITIES, PERSONALITY_NAMES, chooseObjective, type Personality, type PersonalityName } from "./personality";
export { PRESTIGE_UNIT, situation, type AiView, type Situation } from "./view";
export { planDay, type DayPlan } from "./day";
export { planOrders, targets, militaryNeed, militaryWant, type Target } from "./orders";
export { offerGain, proposeOffer, type OfferPlan } from "./trade";
export { cardValue, lotValue, planBids, planCards } from "./auction";
export { planCrown, planMercenaries, type CrownPlan } from "./oro";
export { botPaysRansom, botRansomPrice } from "./ransom";
export { answerDelayHours, botHour } from "./schedule";
export { allianceAppetite, breakReason, planDiplomacy, type DiplomacyContext, type DiplomacyPlan } from "./alliances";
