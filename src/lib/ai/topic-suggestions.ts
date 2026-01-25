// Topic suggestions for content generation
// This file is client-safe (no server-only imports)

export function getTopicSuggestions(): Array<{ pillar: string; suggestions: string[] }> {
  return [
    {
      pillar: "GLP-1 Nutrition Basics",
      suggestions: [
        "Why protein matters more than calories on GLP-1s",
        "How much protein do you really need on Ozempic/Mounjaro (the 1.2-1.6g/kg target)",
        "Hydration tips for GLP-1 users: why it matters more now",
        "Building a balanced plate when your appetite is basically gone",
        "Why eating enough still matters even when you're not hungry",
        "Spreading protein across meals: the 20-30g per meal approach"
      ]
    },
    {
      pillar: "Side Effect Management",
      suggestions: [
        "5 dietitian-approved ways to manage nausea on GLP-1 medications",
        "Constipation on Ozempic: What actually helps (and what doesn't)",
        "Why you might feel tired on GLP-1s (it might be your nutrition)",
        "Managing reflux while on weight loss medications",
        "What to expect when increasing your dose",
        "Hair loss on GLP-1s: The protein connection"
      ]
    },
    {
      pillar: "Practical Meal Ideas",
      suggestions: [
        "High-protein snacks when you're not hungry but need fuel",
        "Quick 20-30g protein meals for busy days",
        "Meal prep ideas for low appetite weeks",
        "Gentle, nausea-friendly foods that still hit your protein goals",
        "Protein-rich breakfasts that actually sound appealing",
        "30g protein dinners that won't overwhelm you"
      ]
    },
    {
      pillar: "Behavior & Mindset",
      suggestions: [
        "Food noise is gone, but now what? Navigating the quiet",
        "Evening cravings on GLP-1s: The HALT approach",
        "Building sustainable habits for when you reduce or stop meds",
        "Sustainable beats perfect: Why progress matters more than perfection",
        "Curiosity over criticism: A better approach to nutrition",
        "Head hunger vs. stomach hunger: Learning the difference"
      ]
    },
    {
      pillar: "Evening Eating & Mindful Evenings",
      suggestions: [
        "It's 9pm and you're not hungry but standing at the fridge anyway",
        "The medication works during the day, but evenings are still hard",
        "Cravings are data, not weakness: Reframing evening urges",
        "What to do when you're not hungry but can't stop thinking about food",
        "The 2-minute evening check-in that changes everything",
        "Why the HALT framework works for GLP-1 users"
      ]
    },
    {
      pillar: "Product Features",
      suggestions: [
        "Why protein-first tracking beats calorie counting",
        "The value of tracking symptoms on GLP-1s",
        "How tracking helps you understand YOUR patterns",
        "Using Mindful Evenings check-ins to understand evening triggers"
      ]
    }
  ];
}
