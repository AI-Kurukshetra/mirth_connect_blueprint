/**
 * Sample HL7 v2.x messages for testing
 */

/** ADT^A01 - Patient Admission */
export const SAMPLE_ADT_A01 = [
  "MSH|^~\\&|EPIC|HOSPITAL_A|RHAPSODY|HIE_SYSTEM|20250315120000||ADT^A01^ADT_A01|MSG00001|P|2.5.1|||AL|NE",
  "EVN|A01|20250315120000|||ADMIN^SMITH^JOHN",
  "PID|1||MRN12345^^^HOSPITAL_A^MR~SSN987654321^^^SSA^SS||DOE^JANE^MARIE^^MS||19850315|F||2106-3^White^CDCREC|123 MAIN ST^^SPRINGFIELD^IL^62701^US|||EN^English^HL70296|M^Married^HL70002|CHR^Christian^HL70006|ACCT001^^^HOSPITAL_A^AN|987-65-4321",
  "PV1|1|I|WEST^W101^A^HOSPITAL_A^^^^2|||WEST^W100|||MED||||ADM|||ATTEND^JONES^ROBERT^J^^^MD^^NPI^^^^NPI|MED||SELF|||||||||||||||||||HOSPITAL_A||ACTIVE|||20250315120000",
  "NK1|1|DOE^JOHN^R||123 MAIN ST^^SPRINGFIELD^IL^62701^US|(555)555-1234|(555)555-5678|SPO^Spouse^HL70063",
  "NK1|2|DOE^MARY^L||456 OAK AVE^^SPRINGFIELD^IL^62702^US|(555)555-9012||PAR^Parent^HL70063",
  "IN1|1|BCBS001^BLUE CROSS BLUE SHIELD|BCBS|BLUE CROSS BLUE SHIELD|PO BOX 1234^^CHICAGO^IL^60601|||GRP12345||||20250101||||DOE^JANE^MARIE|SELF|19850315|123 MAIN ST^^SPRINGFIELD^IL^62701^US||||||||||||||||POL789456",
  "AL1|1|DA^Drug Allergy^HL70127|PCN^Penicillin^RXNORM|SEV^Severe^HL70128|Anaphylaxis|20200101",
  "DG1|1||J18.9^Pneumonia, unspecified organism^ICD10|||A",
].join("\r");

/** ORU^R01 - Lab Result (Observation Result) */
export const SAMPLE_ORU_R01 = [
  "MSH|^~\\&|LAB_SYSTEM|MAIN_LAB|EPIC|HOSPITAL_A|20250315143000||ORU^R01^ORU_R01|LAB20250315001|P|2.5.1|||AL|NE",
  "PID|1||MRN12345^^^HOSPITAL_A^MR||DOE^JANE^MARIE^^MS||19850315|F||2106-3^White^CDCREC|123 MAIN ST^^SPRINGFIELD^IL^62701^US|||EN^English",
  "PV1|1|I|WEST^W101^A^HOSPITAL_A",
  "ORC|RE|ORD789^EPIC|FIL456^LAB_SYSTEM||CM|||20250315100000|||ATTEND^JONES^ROBERT^J^^^MD",
  "OBR|1|ORD789^EPIC|FIL456^LAB_SYSTEM|CBC^Complete Blood Count^L|||20250315100000|||||||||ATTEND^JONES^ROBERT^J^^^MD||||||20250315143000|||F",
  "OBX|1|NM|WBC^White Blood Cell Count^L||11.5|10*3/uL|4.5-11.0|H|||F|||20250315142500",
  "OBX|2|NM|RBC^Red Blood Cell Count^L||4.2|10*6/uL|4.0-5.5|N|||F|||20250315142500",
  "OBX|3|NM|HGB^Hemoglobin^L||12.8|g/dL|12.0-16.0|N|||F|||20250315142500",
  "OBX|4|NM|HCT^Hematocrit^L||38.5|%|36.0-46.0|N|||F|||20250315142500",
  "OBX|5|NM|PLT^Platelet Count^L||245|10*3/uL|150-400|N|||F|||20250315142500",
  "OBR|2|ORD790^EPIC|FIL457^LAB_SYSTEM|BMP^Basic Metabolic Panel^L|||20250315100000|||||||||ATTEND^JONES^ROBERT^J^^^MD||||||20250315143000|||F",
  "OBX|6|NM|GLU^Glucose^L||98|mg/dL|70-100|N|||F|||20250315142800",
  "OBX|7|NM|BUN^Blood Urea Nitrogen^L||18|mg/dL|7-20|N|||F|||20250315142800",
  "OBX|8|NM|CRE^Creatinine^L||1.1|mg/dL|0.6-1.2|N|||F|||20250315142800",
  "OBX|9|NM|NA^Sodium^L||140|mmol/L|136-145|N|||F|||20250315142800",
  "OBX|10|NM|K^Potassium^L||4.2|mmol/L|3.5-5.0|N|||F|||20250315142800",
].join("\r");

/** ORM^O01 - Order Message */
export const SAMPLE_ORM_O01 = [
  "MSH|^~\\&|EPIC|HOSPITAL_A|LAB_SYSTEM|MAIN_LAB|20250315090000||ORM^O01^ORM_O01|ORD20250315001|P|2.5.1|||AL|NE",
  "PID|1||MRN12345^^^HOSPITAL_A^MR||DOE^JANE^MARIE^^MS||19850315|F||2106-3^White^CDCREC|123 MAIN ST^^SPRINGFIELD^IL^62701^US",
  "PV1|1|I|WEST^W101^A^HOSPITAL_A||||ATTEND^JONES^ROBERT^J^^^MD",
  "ORC|NW|ORD789^EPIC||GRP001^EPIC|||||20250315090000|||ATTEND^JONES^ROBERT^J^^^MD",
  "OBR|1|ORD789^EPIC||CBC^Complete Blood Count^L|||20250315090000|||||||||ATTEND^JONES^ROBERT^J^^^MD",
  "NTE|1||STAT order - patient presenting with fever and elevated WBC from ED",
  "ORC|NW|ORD790^EPIC||GRP001^EPIC|||||20250315090000|||ATTEND^JONES^ROBERT^J^^^MD",
  "OBR|2|ORD790^EPIC||BMP^Basic Metabolic Panel^L|||20250315090000|||||||||ATTEND^JONES^ROBERT^J^^^MD",
  "ORC|NW|ORD791^EPIC||GRP001^EPIC|||||20250315090000|||ATTEND^JONES^ROBERT^J^^^MD",
  "OBR|3|ORD791^EPIC||BCULT^Blood Culture^L|||20250315090000|||||||||ATTEND^JONES^ROBERT^J^^^MD",
  "NTE|1||Collect 2 sets from different sites",
].join("\r");

export interface SampleMessage {
  id: string;
  name: string;
  description: string;
  messageType: string;
  message: string;
}

export const SAMPLE_MESSAGES: SampleMessage[] = [
  {
    id: "adt-a01",
    name: "ADT^A01 - Patient Admission",
    description: "Patient admission message with demographics, next of kin, insurance, allergies, and diagnosis",
    messageType: "ADT^A01",
    message: SAMPLE_ADT_A01,
  },
  {
    id: "oru-r01",
    name: "ORU^R01 - Lab Results",
    description: "Lab observation result with CBC and Basic Metabolic Panel results",
    messageType: "ORU^R01",
    message: SAMPLE_ORU_R01,
  },
  {
    id: "orm-o01",
    name: "ORM^O01 - Lab Order",
    description: "Laboratory order for CBC, BMP, and Blood Culture with STAT priority",
    messageType: "ORM^O01",
    message: SAMPLE_ORM_O01,
  },
];
