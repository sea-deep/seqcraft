export interface OpentronsPCRParams {
  protocolName?: string;
  author?: string;
  description?: string;
  apiLevel?: string;
  robotModel?: "OT-2" | "Flex";
  templateDocName: string;
  forwardPrimerName: string;
  reversePrimerName: string;
  ampliconLengthBp: number;
  annealingTempC: number;
  numReactions: number;
  reactionVolumeUl?: number;
  templateVolumeUl?: number;
  fwdPrimerVolumeUl?: number;
  revPrimerVolumeUl?: number;
  masterMixVolumeUl?: number;
}

export interface OpentronsDigestParams {
  protocolName?: string;
  author?: string;
  description?: string;
  apiLevel?: string;
  robotModel?: "OT-2" | "Flex";
  dnaDocName: string;
  enzymeNames: string[];
  incubationTempC?: number;
  incubationTimeMin?: number;
  numReactions: number;
  reactionVolumeUl?: number;
  dnaVolumeUl?: number;
  enzymeVolumeUl?: number;
  bufferVolumeUl?: number;
}

export interface OpentronsProtocolResult {
  pythonCode: string;
  filename: string;
  reagentPlateMap: Record<string, string>;
  tubeRackMap: Record<string, string>;
  billOfMaterials: Array<{ item: string; quantity: string; notes: string }>;
  summary: string;
}

import { OPENTRONS_DEFAULTS } from '../config/scientific-defaults';
import { APP_LIMITS } from '../config/app-limits';

export const OT2_AVAILABLE_TIP_SLOTS = OPENTRONS_DEFAULTS.ot2AvailableTipSlots;
export const FLEX_AVAILABLE_TIP_SLOTS = OPENTRONS_DEFAULTS.flexAvailableTipSlots;

/**
 * Returns valid 24-tube rack coordinates (A1..A6, B1..B6, C1..C6, D1..D6).
 * Throws if index exceeds 23 (24 tubes maximum).
 */
export function getTuberackWell(index: number): string {
  if (index < 0 || index >= APP_LIMITS.MAX_TUBERACK_CAPACITY) {
    throw new Error(`Tube rack index ${index} exceeds 24-tube rack capacity (max ${APP_LIMITS.MAX_TUBERACK_CAPACITY} positions A1..D6).`);
  }
  const row = String.fromCharCode(65 + Math.floor(index / 6));
  const col = (index % 6) + 1;
  return `${row}${col}`;
}

export function compileOpentronsPCRProtocol(params: OpentronsPCRParams): OpentronsProtocolResult {
  const protocolName = params.protocolName || (`PCR Setup - ${params.templateDocName}`);
  const author = params.author || "SeqCraft Bio-CAD";
  const description = params.description || (`Automated PCR setup for ${params.templateDocName} with ${params.forwardPrimerName} and ${params.reversePrimerName}`);
  const apiLevel = params.apiLevel || "2.15";
  const robotModel = params.robotModel || "OT-2";
  const numReactions = Math.max(1, Math.min(params.numReactions, 96));
  
  const reactionVolumeUl = params.reactionVolumeUl ?? 50;
  const masterMixVolumeUl = params.masterMixVolumeUl ?? 25;
  const fwdPrimerVolumeUl = params.fwdPrimerVolumeUl ?? 2.5;
  const revPrimerVolumeUl = params.revPrimerVolumeUl ?? 2.5;
  const templateVolumeUl = params.templateVolumeUl ?? 2;

  const componentsSum = masterMixVolumeUl + fwdPrimerVolumeUl + revPrimerVolumeUl + templateVolumeUl;
  if (componentsSum > reactionVolumeUl) {
    throw new Error(`Component volumes (${componentsSum} uL) exceed target reaction volume (${reactionVolumeUl} uL). Adjust recipe volumes.`);
  }
  
  const waterVolumeUl = Math.round((reactionVolumeUl - componentsSum) * 10) / 10;
  const extensionTimeSec = Math.max(15, Math.ceil((params.ampliconLengthBp / 1000) * 30));
  const annealingTemp = Math.round(params.annealingTempC * 10) / 10;
  
  // Tuberack assignment with 24-well bounds
  const tubeRackMap: Record<string, string> = {
    [getTuberackWell(0)]: "Nuclease-free Water (dH2O)",
    [getTuberackWell(1)]: "2X PCR Master Mix (Taq/Q5/Phusion)",
    [getTuberackWell(2)]: `Forward Primer: ${params.forwardPrimerName} (10 uM)`,
    [getTuberackWell(3)]: `Reverse Primer: ${params.reversePrimerName} (10 uM)`,
    [getTuberackWell(4)]: `Template DNA: ${params.templateDocName}`,
  };

  const reagentPlateMap: Record<string, string> = {};
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  for (let i = 0; i < numReactions; i++) {
    const r = rows[i % 8];
    const c = Math.floor(i / 8) + 1;
    const well = `${r}${c}`;
    reagentPlateMap[well] = `PCR Reaction ${i + 1} (${params.templateDocName})`;
  }

  const overageMultiplier = 1.10;
  const totalWaterNeeded = Math.round(waterVolumeUl * numReactions * overageMultiplier);
  const totalMMNeeded = Math.round(masterMixVolumeUl * numReactions * overageMultiplier);
  const totalFwdNeeded = Math.round(fwdPrimerVolumeUl * numReactions * overageMultiplier);
  const totalRevNeeded = Math.round(revPrimerVolumeUl * numReactions * overageMultiplier);

  const needP300 = masterMixVolumeUl > 20 || waterVolumeUl > 20;
  const p20Transfers = (waterVolumeUl > 0 && waterVolumeUl <= 20 ? 1 : 0) +
    (masterMixVolumeUl <= 20 ? numReactions : 0) +
    (numReactions * 2) /* primers */ +
    numReactions /* template */;
  const p300Transfers = (waterVolumeUl > 20 ? 1 : 0) + (masterMixVolumeUl > 20 ? numReactions : 0);

  const p20RacksNeeded = Math.max(1, Math.ceil(p20Transfers / 96));
  const p300RacksNeeded = needP300 ? Math.max(1, Math.ceil(p300Transfers / 96)) : 0;
  const isFlex = robotModel === "Flex";

  const flexTransfers = (waterVolumeUl > 0 ? 1 : 0) + (numReactions * 4);
  const flexRacksNeeded = Math.max(1, Math.ceil(flexTransfers / 96));

  const p20Slots = OT2_AVAILABLE_TIP_SLOTS.slice(0, p20RacksNeeded);
  const p300Slots = OT2_AVAILABLE_TIP_SLOTS.slice(p20RacksNeeded, p20RacksNeeded + p300RacksNeeded);
  const flexSlots = FLEX_AVAILABLE_TIP_SLOTS.slice(0, flexRacksNeeded);

  const billOfMaterials = [
    { item: "Nuclease-free Water", quantity: `${totalWaterNeeded} uL`, notes: `Place in Tube ${getTuberackWell(0)}` },
    { item: "2X PCR Master Mix", quantity: `${totalMMNeeded} uL`, notes: `Place in Tube ${getTuberackWell(1)}` },
    { item: `${params.forwardPrimerName} (10 uM)`, quantity: `${totalFwdNeeded} uL`, notes: `Place in Tube ${getTuberackWell(2)}` },
    { item: `${params.reversePrimerName} (10 uM)`, quantity: `${totalRevNeeded} uL`, notes: `Place in Tube ${getTuberackWell(3)}` },
    { item: `Template DNA (${params.templateDocName})`, quantity: `${Math.round(templateVolumeUl * numReactions * 1.15)} uL`, notes: `Place in Tube ${getTuberackWell(4)}` },
    { item: "96-Well PCR Plate", quantity: "1 plate", notes: "NEST 0.1 mL full skirt in Slot 7 or Thermocycler" },
    ...(isFlex
      ? [{ item: "50 uL Flex Filter Tips", quantity: `${flexRacksNeeded} rack(s)`, notes: `Opentrons Flex 96 tip rack (Slots ${flexSlots.join(", ")})` }]
      : [
          { item: "20 uL Filter Tips", quantity: `${p20RacksNeeded} rack(s)`, notes: `Opentrons 96 tip rack (Slots ${p20Slots.join(", ")})` },
          ...(needP300 ? [{ item: "300 uL Filter Tips", quantity: `${p300RacksNeeded} rack(s)`, notes: `Opentrons 96 tip rack (Slots ${p300Slots.join(", ")})` }] : []),
        ]),
  ];

  const wellsList = Object.keys(reagentPlateMap).map(w => JSON.stringify(w)).join(", ");

  const pythonCode = [
    `"""`,
    protocolName,
    `Author: ${author}`,
    `Description: ${description}`,
    `Generated by SeqCraft In-Silico Bio-CAD (Physical Validity Certified)`,
    `"""`,
    `from opentrons import protocol_api`,
    ``,
    `metadata = {`,
    `    "protocolName": ${JSON.stringify(protocolName)},`,
    `    "author": ${JSON.stringify(author)},`,
    `    "description": ${JSON.stringify(description)},`,
    `    "apiLevel": ${JSON.stringify(apiLevel)}`,
    `}`,
    ``,
    `def run(protocol: protocol_api.ProtocolContext):`,
    `    # Load Tip Racks`,
    isFlex ? [
      `    tipracks_50 = [protocol.load_labware("opentrons_flex_96_tiprack_50ul", slot) for slot in ${JSON.stringify(flexSlots)}]`,
      `    pipette = protocol.load_instrument("flex_1channel_50", "left", tip_racks=tipracks_50)`,
    ].join("\n") : [
      `    tipracks_20 = [protocol.load_labware("opentrons_96_tiprack_20ul", slot) for slot in ${JSON.stringify(p20Slots)}]`,
      needP300 ? `    tipracks_300 = [protocol.load_labware("opentrons_96_tiprack_300ul", slot) for slot in ${JSON.stringify(p300Slots)}]` : ``,
      `    p20 = protocol.load_instrument("p20_single_gen2", "right", tip_racks=tipracks_20)`,
      needP300 ? `    p300 = protocol.load_instrument("p300_single_gen2", "left", tip_racks=tipracks_300)` : ``,
    ].filter(Boolean).join("\n"),
    ``,
    `    tuberack = protocol.load_labware("opentrons_24_tuberack_generic_2ml_screwcap", ${JSON.stringify(isFlex ? "C1" : "6")})`,
    `    water = tuberack[${JSON.stringify(getTuberackWell(0))}]`,
    `    master_mix = tuberack[${JSON.stringify(getTuberackWell(1))}]`,
    `    fwd_primer = tuberack[${JSON.stringify(getTuberackWell(2))}]`,
    `    rev_primer = tuberack[${JSON.stringify(getTuberackWell(3))}]`,
    `    template_dna = tuberack[${JSON.stringify(getTuberackWell(4))}]`,
    ``,
    `    pcr_plate = protocol.load_labware("nest_96_wellplate_100ul_pcr_full_skirt", ${JSON.stringify(isFlex ? "B1" : "7")})`,
    `    reaction_wells = [pcr_plate[well] for well in [${wellsList}]]`,
    ``,
    waterVolumeUl > 0 ? [
      `    protocol.comment(${JSON.stringify(`Distributing ${waterVolumeUl} uL of nuclease-free water...`)})`,
      isFlex ? `    pipette.pick_up_tip()` : (waterVolumeUl > 20 ? `    p300.pick_up_tip()` : `    p20.pick_up_tip()`),
      `    for well in reaction_wells:`,
      isFlex ? `        pipette.aspirate(${waterVolumeUl}, water)` : (waterVolumeUl > 20 ? `        p300.aspirate(${waterVolumeUl}, water)` : `        p20.aspirate(${waterVolumeUl}, water)`),
      isFlex ? `        pipette.dispense(${waterVolumeUl}, well)` : (waterVolumeUl > 20 ? `        p300.dispense(${waterVolumeUl}, well)` : `        p20.dispense(${waterVolumeUl}, well)`),
      isFlex ? `    pipette.drop_tip()` : (waterVolumeUl > 20 ? `    p300.drop_tip()` : `    p20.drop_tip()`),
    ].join("\n") : `    # No water required`,
    ``,
    `    protocol.comment(${JSON.stringify(`Distributing ${masterMixVolumeUl} uL of 2X Master Mix...`)})`,
    `    for well in reaction_wells:`,
    isFlex ? [
      `        pipette.pick_up_tip()`,
      `        pipette.aspirate(${masterMixVolumeUl}, master_mix)`,
      `        pipette.dispense(${masterMixVolumeUl}, well)`,
      `        pipette.drop_tip()`
    ].join("\n") : (masterMixVolumeUl > 20 ? [
      `        p300.pick_up_tip()`,
      `        p300.aspirate(${masterMixVolumeUl}, master_mix)`,
      `        p300.dispense(${masterMixVolumeUl}, well)`,
      `        p300.drop_tip()`
    ].join("\n") : [
      `        p20.pick_up_tip()`,
      `        p20.aspirate(${masterMixVolumeUl}, master_mix)`,
      `        p20.dispense(${masterMixVolumeUl}, well)`,
      `        p20.drop_tip()`
    ].join("\n")),
    ``,
    `    protocol.comment(${JSON.stringify(`Adding ${fwdPrimerVolumeUl} uL of Forward Primer (${params.forwardPrimerName})...`)})`,
    `    for well in reaction_wells:`,
    isFlex ? [
      `        pipette.pick_up_tip()`,
      `        pipette.aspirate(${fwdPrimerVolumeUl}, fwd_primer)`,
      `        pipette.dispense(${fwdPrimerVolumeUl}, well)`,
      `        pipette.drop_tip()`
    ].join("\n") : [
      `        p20.pick_up_tip()`,
      `        p20.aspirate(${fwdPrimerVolumeUl}, fwd_primer)`,
      `        p20.dispense(${fwdPrimerVolumeUl}, well)`,
      `        p20.drop_tip()`
    ].join("\n"),
    ``,
    `    protocol.comment(${JSON.stringify(`Adding ${revPrimerVolumeUl} uL of Reverse Primer (${params.reversePrimerName})...`)})`,
    `    for well in reaction_wells:`,
    isFlex ? [
      `        pipette.pick_up_tip()`,
      `        pipette.aspirate(${revPrimerVolumeUl}, rev_primer)`,
      `        pipette.dispense(${revPrimerVolumeUl}, well)`,
      `        pipette.drop_tip()`
    ].join("\n") : [
      `        p20.pick_up_tip()`,
      `        p20.aspirate(${revPrimerVolumeUl}, rev_primer)`,
      `        p20.dispense(${revPrimerVolumeUl}, well)`,
      `        p20.drop_tip()`
    ].join("\n"),
    ``,
    `    protocol.comment(${JSON.stringify(`Adding ${templateVolumeUl} uL of Template DNA (${params.templateDocName}) and mixing...`)})`,
    `    for well in reaction_wells:`,
    isFlex ? [
      `        pipette.pick_up_tip()`,
      `        pipette.aspirate(${templateVolumeUl}, template_dna)`,
      `        pipette.dispense(${templateVolumeUl}, well)`,
      `        pipette.mix(3, 10, well)`,
      `        pipette.drop_tip()`
    ].join("\n") : [
      `        p20.pick_up_tip()`,
      `        p20.aspirate(${templateVolumeUl}, template_dna)`,
      `        p20.dispense(${templateVolumeUl}, well)`,
      `        p20.mix(3, 10, well)`,
      `        p20.drop_tip()`
    ].join("\n"),
    ``,
    `    protocol.comment("PCR reaction setup complete.")`,
    `    protocol.comment(${JSON.stringify(`Thermocycler profile: 95C 2m -> 30x (95C 30s, ${annealingTemp}C 30s, 72C ${extensionTimeSec}s) -> 72C 5m -> 4C hold`)})`,
    ``
  ].join("\n");

  return {
    pythonCode,
    filename: `opentrons_pcr_${params.templateDocName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.py`,
    reagentPlateMap,
    tubeRackMap,
    billOfMaterials,
    summary: `Compiled Opentrons PCR protocol for ${numReactions} reaction(s) (${params.templateDocName} with ${params.forwardPrimerName}/${params.reversePrimerName}, Ta=${annealingTemp}C, ext=${extensionTimeSec}s)`
  };
}

export function compileOpentronsDigestProtocol(params: OpentronsDigestParams): OpentronsProtocolResult {
  const protocolName = params.protocolName || (`Restriction Digest - ${params.dnaDocName}`);
  const author = params.author || "SeqCraft Bio-CAD";
  const description = params.description || (`Automated restriction digest setup for ${params.dnaDocName} using ${params.enzymeNames.join(", ")}`);
  const apiLevel = params.apiLevel || "2.15";
  const robotModel = params.robotModel || "OT-2";
  const numReactions = Math.max(1, Math.min(params.numReactions, 96));
  
  const reactionVolumeUl = params.reactionVolumeUl ?? 50;
  const dnaVolumeUl = params.dnaVolumeUl ?? 10;
  const bufferVolumeUl = params.bufferVolumeUl ?? 5;
  const enzymeVolumeUl = params.enzymeVolumeUl ?? 1;
  const totalEnzymeVolume = enzymeVolumeUl * params.enzymeNames.length;
  
  const componentsSum = dnaVolumeUl + bufferVolumeUl + totalEnzymeVolume;
  if (componentsSum > reactionVolumeUl) {
    throw new Error(`Digest components (${componentsSum} uL) exceed total reaction volume (${reactionVolumeUl} uL).`);
  }
  
  const waterVolumeUl = Math.round((reactionVolumeUl - componentsSum) * 10) / 10;
  const incubationTemp = params.incubationTempC ?? 37;
  const incubationTimeMin = params.incubationTimeMin ?? 60;

  // Safe 24-well tuberack positions
  const tubeRackMap: Record<string, string> = {
    [getTuberackWell(0)]: "Nuclease-free Water",
    [getTuberackWell(1)]: "10X Restriction Buffer",
    [getTuberackWell(2)]: `Substrate DNA: ${params.dnaDocName}`,
  };

  params.enzymeNames.forEach((name, i) => {
    const well = getTuberackWell(i + 3);
    tubeRackMap[well] = `Restriction Enzyme: ${name}`;
  });

  const reagentPlateMap: Record<string, string> = {};
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  for (let i = 0; i < numReactions; i++) {
    const r = rows[i % 8];
    const c = Math.floor(i / 8) + 1;
    const well = `${r}${c}`;
    reagentPlateMap[well] = `Digest ${i + 1} (${params.dnaDocName} + ${params.enzymeNames.join("/")})`;
  }

  const needP300 = waterVolumeUl > 20;
  const p20Transfers = (waterVolumeUl > 0 && waterVolumeUl <= 20 ? 1 : 0) +
    numReactions /* buffer */ +
    numReactions /* substrate DNA */ +
    (numReactions * params.enzymeNames.length) /* enzymes */;
  const p300Transfers = waterVolumeUl > 20 ? 1 : 0;

  const p20RacksNeeded = Math.max(1, Math.ceil(p20Transfers / 96));
  const p300RacksNeeded = needP300 ? Math.max(1, Math.ceil(p300Transfers / 96)) : 0;
  const isFlex = robotModel === "Flex";

  const flexTransfers = (waterVolumeUl > 0 ? 1 : 0) + numReactions * (2 + params.enzymeNames.length);
  const flexRacksNeeded = Math.max(1, Math.ceil(flexTransfers / 96));

  const p20Slots = OT2_AVAILABLE_TIP_SLOTS.slice(0, p20RacksNeeded);
  const p300Slots = OT2_AVAILABLE_TIP_SLOTS.slice(p20RacksNeeded, p20RacksNeeded + p300RacksNeeded);
  const flexSlots = FLEX_AVAILABLE_TIP_SLOTS.slice(0, flexRacksNeeded);

  const billOfMaterials = [
    { item: "Nuclease-free Water", quantity: `${Math.round(waterVolumeUl * numReactions * 1.10)} uL`, notes: `Tube ${getTuberackWell(0)}` },
    { item: "10X Restriction Buffer", quantity: `${Math.round(bufferVolumeUl * numReactions * 1.10)} uL`, notes: `Tube ${getTuberackWell(1)}` },
    ...params.enzymeNames.map((name, i) => ({
      item: `Enzyme: ${name}`,
      quantity: `${Math.round(enzymeVolumeUl * numReactions * 1.20)} uL`,
      notes: `Tube ${getTuberackWell(i + 3)} (Keep chilled on cold block)`
    })),
    { item: `Substrate DNA (${params.dnaDocName})`, quantity: `${Math.round(dnaVolumeUl * numReactions * 1.10)} uL`, notes: `Tube ${getTuberackWell(2)}` },
    { item: "96-Well PCR/Reaction Plate", quantity: "1 plate", notes: "Slot 7" },
    ...(isFlex
      ? [{ item: "50 uL Flex Filter Tips", quantity: `${flexRacksNeeded} rack(s)`, notes: `Opentrons Flex 96 tip rack (Slots ${flexSlots.join(", ")})` }]
      : [
          { item: "20 uL Filter Tips", quantity: `${p20RacksNeeded} rack(s)`, notes: `Opentrons 96 tip rack (Slots ${p20Slots.join(", ")})` },
          ...(needP300 ? [{ item: "300 uL Filter Tips", quantity: `${p300RacksNeeded} rack(s)`, notes: `Opentrons 96 tip rack (Slots ${p300Slots.join(", ")})` }] : []),
        ]),
  ];

  const wellsList = Object.keys(reagentPlateMap).map(w => JSON.stringify(w)).join(", ");

  const pythonCode = [
    `"""`,
    protocolName,
    `Author: ${author}`,
    `Description: ${description}`,
    `Generated by SeqCraft In-Silico Bio-CAD (Physical Validity Certified)`,
    `"""`,
    `from opentrons import protocol_api`,
    ``,
    `metadata = {`,
    `    "protocolName": ${JSON.stringify(protocolName)},`,
    `    "author": ${JSON.stringify(author)},`,
    `    "description": ${JSON.stringify(description)},`,
    `    "apiLevel": ${JSON.stringify(apiLevel)}`,
    `}`,
    ``,
    `def run(protocol: protocol_api.ProtocolContext):`,
    `    # Load Tip Racks & Pipettes`,
    isFlex ? [
      `    tipracks_50 = [protocol.load_labware("opentrons_flex_96_tiprack_50ul", slot) for slot in ${JSON.stringify(flexSlots)}]`,
      `    pipette = protocol.load_instrument("flex_1channel_50", "left", tip_racks=tipracks_50)`,
    ].join("\n") : [
      `    tipracks_20 = [protocol.load_labware("opentrons_96_tiprack_20ul", slot) for slot in ${JSON.stringify(p20Slots)}]`,
      needP300 ? `    tipracks_300 = [protocol.load_labware("opentrons_96_tiprack_300ul", slot) for slot in ${JSON.stringify(p300Slots)}]` : ``,
      `    p20 = protocol.load_instrument("p20_single_gen2", "right", tip_racks=tipracks_20)`,
      needP300 ? `    p300 = protocol.load_instrument("p300_single_gen2", "left", tip_racks=tipracks_300)` : ``,
    ].filter(Boolean).join("\n"),
    ``,
    `    tuberack = protocol.load_labware("opentrons_24_tuberack_generic_2ml_screwcap", ${JSON.stringify(isFlex ? "C1" : "6")})`,
    `    water = tuberack[${JSON.stringify(getTuberackWell(0))}]`,
    `    buffer = tuberack[${JSON.stringify(getTuberackWell(1))}]`,
    `    dna = tuberack[${JSON.stringify(getTuberackWell(2))}]`,
    ...params.enzymeNames.map((_, i) => `    enzyme_${i + 1} = tuberack[${JSON.stringify(getTuberackWell(i + 3))}]`),
    ``,
    `    digest_plate = protocol.load_labware("nest_96_wellplate_100ul_pcr_full_skirt", ${JSON.stringify(isFlex ? "B1" : "7")})`,
    `    reaction_wells = [digest_plate[well] for well in [${wellsList}]]`,
    ``,
    `    # Step 1: Add Water`,
    `    protocol.comment(${JSON.stringify(`Distributing ${waterVolumeUl} uL water...`)})`,
    isFlex ? [
      `    pipette.pick_up_tip()`,
      `    for well in reaction_wells:`,
      `        pipette.aspirate(${waterVolumeUl}, water)`,
      `        pipette.dispense(${waterVolumeUl}, well)`,
      `    pipette.drop_tip()`,
    ].join("\n") : (waterVolumeUl > 20 ? [
      `    p300.pick_up_tip()`,
      `    for well in reaction_wells:`,
      `        p300.aspirate(${waterVolumeUl}, water)`,
      `        p300.dispense(${waterVolumeUl}, well)`,
      `    p300.drop_tip()`,
    ].join("\n") : [
      `    p20.pick_up_tip()`,
      `    for well in reaction_wells:`,
      `        p20.aspirate(${waterVolumeUl}, water)`,
      `        p20.dispense(${waterVolumeUl}, well)`,
      `    p20.drop_tip()`,
    ].join("\n")),
    ``,
    `    # Step 2: Add 10X Buffer`,
    `    protocol.comment(${JSON.stringify(`Distributing ${bufferVolumeUl} uL 10X Buffer...`)})`,
    `    for well in reaction_wells:`,
    isFlex ? [
      `        pipette.pick_up_tip()`,
      `        pipette.aspirate(${bufferVolumeUl}, buffer)`,
      `        pipette.dispense(${bufferVolumeUl}, well)`,
      `        pipette.drop_tip()`,
    ].join("\n") : [
      `        p20.pick_up_tip()`,
      `        p20.aspirate(${bufferVolumeUl}, buffer)`,
      `        p20.dispense(${bufferVolumeUl}, well)`,
      `        p20.drop_tip()`,
    ].join("\n"),
    ``,
    `    # Step 3: Add Substrate DNA`,
    `    protocol.comment(${JSON.stringify(`Adding ${dnaVolumeUl} uL Substrate DNA (${params.dnaDocName})...`)})`,
    `    for well in reaction_wells:`,
    isFlex ? [
      `        pipette.pick_up_tip()`,
      `        pipette.aspirate(${dnaVolumeUl}, dna)`,
      `        pipette.dispense(${dnaVolumeUl}, well)`,
      `        pipette.drop_tip()`,
    ].join("\n") : [
      `        p20.pick_up_tip()`,
      `        p20.aspirate(${dnaVolumeUl}, dna)`,
      `        p20.dispense(${dnaVolumeUl}, well)`,
      `        p20.drop_tip()`,
    ].join("\n"),
    ``,
    `    # Step 4: Add Enzymes`,
    ...params.enzymeNames.map((name, i) => [
      `    protocol.comment(${JSON.stringify(`Adding ${enzymeVolumeUl} uL of Enzyme ${name}...`)})`,
      `    for well in reaction_wells:`,
      isFlex ? [
        `        pipette.pick_up_tip()`,
        `        pipette.aspirate(${enzymeVolumeUl}, enzyme_${i + 1})`,
        `        pipette.dispense(${enzymeVolumeUl}, well)`,
        `        pipette.mix(2, 10, well)`,
        `        pipette.drop_tip()`
      ].join("\n") : [
        `        p20.pick_up_tip()`,
        `        p20.aspirate(${enzymeVolumeUl}, enzyme_${i + 1})`,
        `        p20.dispense(${enzymeVolumeUl}, well)`,
        `        p20.mix(2, 10, well)`,
        `        p20.drop_tip()`
      ].join("\n")
    ].join("\n")),
    ``,
    `    protocol.comment("Digestion setup complete.")`,
    `    protocol.comment(${JSON.stringify(`Incubate at ${incubationTemp}C for ${incubationTimeMin} minutes.`)})`,
    ``
  ].join("\n");

  return {
    pythonCode,
    filename: `opentrons_digest_${params.dnaDocName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.py`,
    reagentPlateMap,
    tubeRackMap,
    billOfMaterials,
    summary: `Compiled Opentrons restriction digest protocol for ${numReactions} reaction(s) (${params.dnaDocName} with ${params.enzymeNames.join(", ")} at ${incubationTemp}C for ${incubationTimeMin}m)`
  };
}
