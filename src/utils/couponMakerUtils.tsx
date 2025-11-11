
const validate = (questionText: string, options: string[]): string | null => {
    if (!questionText.trim()) {
        return "Spørsmålstekst kan ikke være tom.";
    }

    const trimmed = options.map((o) => o.trim()).filter(Boolean);

    if (trimmed.length < 2) {
        return "Du må ha minst 2 svaralternativer"
    }

    const unique = new Set (trimmed);
    if (unique.size !== trimmed.length) {
        return "Alternativene må være unike";
    }

    return null;


}

export default validate