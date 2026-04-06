import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { UserProfile, DailyMealPlan, Language, Meal } from "../types";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = "gemini-3-flash-preview";
const PRO_MODEL_NAME = "gemini-3.1-pro-preview";

const MEAL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    prepTime: { type: Type.STRING, description: "Preparation time (e.g., '20 min', '1 hour')" },
    cookingTime: { type: Type.STRING, description: "Cooking time (e.g., '15 min', '45 min')" },
    steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed step-by-step preparation procedures" },
    nutritionalInfo: {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.NUMBER },
        protein: { type: Type.NUMBER },
        carbs: { type: Type.NUMBER },
        fat: { type: Type.NUMBER },
        fiber: { type: Type.NUMBER },
        saturatedFat: { type: Type.NUMBER },
      },
      required: ["calories", "protein", "carbs", "fat", "fiber", "saturatedFat"],
    },
    recipe: { type: Type.STRING, description: "Full recipe in Markdown format" },
    proTip: { type: Type.STRING, description: "A nutritional or culinary tip specific to this meal" },
  },
  required: ["name", "description", "ingredients", "prepTime", "cookingTime", "steps", "nutritionalInfo", "recipe", "proTip"],
};

// ... (schemas remain the same)

export async function generateSingleMeal(
  profile: UserProfile,
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner',
  lang: Language
): Promise<Meal> {
  const dietDesc = profile.dietType === 'none' ? 'general healthy' : profile.dietType;
  const systemInstruction = `You are an expert clinical nutrition AI specialized in ${dietDesc} diet, low cholesterol, glycemic control, and heart health.
Generate a SINGLE nutritionally balanced meal (${mealType}) in ${lang === 'es' ? 'Spanish' : 'English'} for a user named ${profile.name}.
${profile.countries.length > 0 ? `Adapt the recipe to the culinary culture and typical ingredients of these regions: ${profile.countries.join(", ")}.` : ''}
${profile.favoriteCuisines && profile.favoriteCuisines.length > 0 ? `The user particularly enjoys these cuisines: ${profile.favoriteCuisines.join(", ")}.` : ''}
${profile.spiceLevel ? `Preferred spice level: ${profile.spiceLevel}.` : ''}
Strictly follow these rules:
1. Diet style: ${dietDesc}.
2. Low cholesterol and low saturated fat.
3. Dietary Restrictions: ${profile.dietaryRestrictions.join(", ")}.
4. ALLERGIES (CRITICAL): ${profile.allergies.join(", ")}. DO NOT include any ingredients the user is allergic to.
5. Avoid forbidden ingredients: ${profile.forbiddenIngredients}.
6. Prioritize: ${profile.preferredIngredients} and ${profile.availableIngredients}.
7. LEARN FROM TASTES: 
   - Liked meals (use as inspiration): ${profile.likedMeals?.join(", ") || 'None yet'}.
   - Disliked meals (AVOID these flavors/styles): ${profile.dislikedMeals?.join(", ") || 'None yet'}.
8. INNOVATION: Don't be boring. Create creative, modern, and appetizing recipes that feel like a high-end healthy restaurant.
9. Meals must be realistic for home cooking.
10. Provide a clear preparation time, cooking time, and detailed step-by-step procedures.
11. Include a specific nutritional or culinary tip (proTip) for this meal.`;

  const prompt = `User Profile:
Name: ${profile.name}
Age: ${profile.age}
Gender: ${profile.gender}
Weight: ${profile.weight}kg
Height: ${profile.height}cm
Activity Level: ${profile.activityLevel}
Countries/Regions: ${profile.countries.join(", ") || 'International'}
Diet Type: ${profile.dietType}
Goals: ${profile.healthGoals.join(", ")}
Restrictions: ${profile.dietaryRestrictions.join(", ")}
Allergies: ${profile.allergies.join(", ")}

Generate a delicious and healthy ${mealType}.`;

  const response = await ai.models.generateContent({
    model: PRO_MODEL_NAME,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: MEAL_SCHEMA,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    },
  });

  return JSON.parse(response.text);
}

export async function regenerateSingleMeal(
  profile: UserProfile,
  currentPlan: DailyMealPlan,
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner',
  lang: Language
): Promise<Meal> {
  const dietDesc = profile.dietType === 'none' ? 'general healthy' : profile.dietType;
  const systemInstruction = `You are an expert clinical nutrition AI specialized in ${dietDesc} diet, low cholesterol, glycemic control, and heart health.
Generate a SINGLE nutritionally balanced meal (${mealType}) in ${lang === 'es' ? 'Spanish' : 'English'} for a user named ${profile.name}.
${profile.countries.length > 0 ? `Adapt the recipe to the culinary culture and typical ingredients of these regions: ${profile.countries.join(", ")}.` : ''}
${profile.favoriteCuisines && profile.favoriteCuisines.length > 0 ? `The user particularly enjoys these cuisines: ${profile.favoriteCuisines.join(", ")}.` : ''}
${profile.spiceLevel ? `Preferred spice level: ${profile.spiceLevel}.` : ''}
Strictly follow these rules:
1. Diet style: ${dietDesc}.
2. Low cholesterol and low saturated fat.
3. Dietary Restrictions: ${profile.dietaryRestrictions.join(", ")}.
4. ALLERGIES (CRITICAL): ${profile.allergies.join(", ")}. DO NOT include any ingredients the user is allergic to.
5. Avoid forbidden ingredients: ${profile.forbiddenIngredients}.
6. Prioritize: ${profile.preferredIngredients} and ${profile.availableIngredients}.
7. AVOID REPEATING the current meal: ${currentPlan[mealType].name}.
8. LEARN FROM TASTES: 
   - Liked meals (use as inspiration): ${profile.likedMeals?.join(", ") || 'None yet'}.
   - Disliked meals (AVOID these flavors/styles): ${profile.dislikedMeals?.join(", ") || 'None yet'}.
9. INNOVATION: Don't be boring. Create creative, modern, and appetizing recipes that feel like a high-end healthy restaurant.
10. Ensure it complements the other meals in the day:
   - Breakfast: ${currentPlan.breakfast.name}
   - Lunch: ${currentPlan.lunch.name}
   - Snack: ${currentPlan.snack.name}
   - Dinner: ${currentPlan.dinner.name}
11. Meals must be realistic for home cooking.
12. Provide a clear preparation time, cooking time, and detailed step-by-step procedures.
13. Include a specific nutritional or culinary tip (proTip) for this meal.`;

  const prompt = `User Profile:
Name: ${profile.name}
Age: ${profile.age}
Gender: ${profile.gender}
Weight: ${profile.weight}kg
Height: ${profile.height}cm
Activity Level: ${profile.activityLevel}
Countries/Regions: ${profile.countries.join(", ") || 'International'}
Diet Type: ${profile.dietType}
Goals: ${profile.healthGoals.join(", ")}
Restrictions: ${profile.dietaryRestrictions.join(", ")}
Allergies: ${profile.allergies.join(", ")}

Generate a new ${mealType} to replace the current one.`;

  const response = await ai.models.generateContent({
    model: PRO_MODEL_NAME,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: MEAL_SCHEMA,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    },
  });

  return JSON.parse(response.text);
}

const DAILY_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    date: { type: Type.STRING },
    breakfast: MEAL_SCHEMA,
    lunch: MEAL_SCHEMA,
    snack: MEAL_SCHEMA,
    dinner: MEAL_SCHEMA,
    totalNutrition: {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.NUMBER },
        protein: { type: Type.NUMBER },
        carbs: { type: Type.NUMBER },
        fat: { type: Type.NUMBER },
        fiber: { type: Type.NUMBER },
        saturatedFat: { type: Type.NUMBER },
        glycemicLoad: { type: Type.STRING },
      },
      required: ["calories", "protein", "carbs", "fat", "fiber", "saturatedFat", "glycemicLoad"],
    },
    advice: { type: Type.STRING },
  },
  required: ["date", "breakfast", "lunch", "snack", "dinner", "totalNutrition", "advice"],
};

const WEEKLY_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    days: {
      type: Type.ARRAY,
      items: DAILY_PLAN_SCHEMA,
    },
    shoppingList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          items: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["category", "items"],
      },
    },
    weeklyAdvice: { type: Type.STRING },
  },
  required: ["title", "days", "shoppingList", "weeklyAdvice"],
};

const MONTHLY_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    weeks: {
      type: Type.ARRAY,
      items: WEEKLY_PLAN_SCHEMA,
    },
    monthlyAdvice: { type: Type.STRING },
  },
  required: ["title", "weeks", "monthlyAdvice"],
};

export async function generateMealPlan(
  profile: UserProfile,
  recentMeals: string[],
  lang: Language
): Promise<DailyMealPlan> {
  const dietDesc = profile.dietType === 'none' ? 'general healthy' : profile.dietType;
  const systemInstruction = `You are an expert clinical nutrition AI specialized in ${dietDesc} diet, low cholesterol, glycemic control, and heart health.
Generate a nutritionally balanced daily meal plan in ${lang === 'es' ? 'Spanish' : 'English'} for a user named ${profile.name}.
${profile.countries.length > 0 ? `Adapt the recipes to the culinary culture and typical ingredients of these regions: ${profile.countries.join(", ")}.` : ''}
${profile.favoriteCuisines && profile.favoriteCuisines.length > 0 ? `The user particularly enjoys these cuisines: ${profile.favoriteCuisines.join(", ")}.` : ''}
${profile.spiceLevel ? `Preferred spice level: ${profile.spiceLevel}.` : ''}
Strictly follow these rules:
1. Diet style: ${dietDesc}.
2. Low cholesterol and low saturated fat.
3. Dietary Restrictions: ${profile.dietaryRestrictions.join(", ")}.
4. ALLERGIES (CRITICAL): ${profile.allergies.join(", ")}. DO NOT include any ingredients the user is allergic to.
5. Avoid forbidden ingredients: ${profile.forbiddenIngredients}.
6. Prioritize: ${profile.preferredIngredients} and ${profile.availableIngredients}.
7. Recent meals to avoid: ${recentMeals.join(", ")}.
8. LEARN FROM TASTES: 
   - Liked meals (use as inspiration): ${profile.likedMeals?.join(", ") || 'None yet'}.
   - Disliked meals (AVOID these flavors/styles): ${profile.dislikedMeals?.join(", ") || 'None yet'}.
9. INNOVATION: Don't be boring. Create creative, modern, and appetizing recipes that feel like a high-end healthy restaurant.
10. Nutritional targets: Adjust calories and macros based on goals: ${profile.healthGoals.join(", ")}.
11. Meals must be realistic for home cooking.
12. For each meal, provide a clear preparation time and detailed step-by-step procedures.
13. Generate a CATCHY and ATTRACTIVE TITLE for the plan that reflects the culinary influence (e.g., "Sinfonía Mediterránea", "Esencia de la Toscana", "Sabor de Andalucía").`;

  const prompt = `User Profile:
Name: ${profile.name}
Age: ${profile.age}
Gender: ${profile.gender}
Weight: ${profile.weight}kg
Height: ${profile.height}cm
Activity Level: ${profile.activityLevel}
Countries/Regions: ${profile.countries.join(", ") || 'International'}
Diet Type: ${profile.dietType}
Goals: ${profile.healthGoals.join(", ")}
Restrictions: ${profile.dietaryRestrictions.join(", ")}
Allergies: ${profile.allergies.join(", ")}

Generate a complete daily meal plan (Breakfast, Lunch, Snack, Dinner).`;

  const response = await ai.models.generateContent({
    model: PRO_MODEL_NAME,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: DAILY_PLAN_SCHEMA,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    },
  });

  return JSON.parse(response.text);
}

export async function generateWeeklyPlan(
  profile: UserProfile,
  recentMeals: string[],
  lang: Language
): Promise<any> {
  const dietDesc = profile.dietType === 'none' ? 'general healthy' : profile.dietType;
  const systemInstruction = `You are an expert clinical nutrition AI specialized in ${dietDesc} diet, low cholesterol, glycemic control, and heart health.
Generate a nutritionally balanced WEEKLY meal plan (7 days) in ${lang === 'es' ? 'Spanish' : 'English'} for a user named ${profile.name}.
${profile.countries.length > 0 ? `Adapt the recipes to the culinary culture and typical ingredients of these regions: ${profile.countries.join(", ")}.` : ''}
Strictly follow these rules:
1. Diet style: ${dietDesc}.
2. Low cholesterol and low saturated fat.
3. Dietary Restrictions: ${profile.dietaryRestrictions.join(", ")}.
4. ALLERGIES (CRITICAL): ${profile.allergies.join(", ")}. DO NOT include any ingredients the user is allergic to.
5. Avoid forbidden ingredients: ${profile.forbiddenIngredients}.
6. Prioritize: ${profile.preferredIngredients} and ${profile.availableIngredients}.
7. Recent meals to avoid: ${recentMeals.join(", ")}.
8. Nutritional targets per day: Adjust based on goals: ${profile.healthGoals.join(", ")}.
9. Meals must be realistic for home cooking.
10. For each meal, provide a clear preparation time and detailed step-by-step procedures.
11. Include a categorized shopping list for the entire week.
12. Generate a CATCHY and ATTRACTIVE TITLE for the weekly plan that reflects the culinary influence (e.g., "Ruta Gastronómica Mediterránea", "Semana de Bienestar Ibérico", "Gran Tour de Italia").`;

  const prompt = `User Profile:
Name: ${profile.name}
Age: ${profile.age}
Gender: ${profile.gender}
Weight: ${profile.weight}kg
Height: ${profile.height}cm
Activity Level: ${profile.activityLevel}
Countries/Regions: ${profile.countries.join(", ") || 'International'}
Diet Type: ${profile.dietType}
Goals: ${profile.healthGoals.join(", ")}
Restrictions: ${profile.dietaryRestrictions.join(", ")}
Allergies: ${profile.allergies.join(", ")}

Generate a complete 7-day weekly meal plan and shopping list.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: WEEKLY_PLAN_SCHEMA,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    },
  });

  return JSON.parse(response.text);
}

export async function generateMonthlyPlan(
  profile: UserProfile,
  lang: Language
): Promise<any> {
  const dietDesc = profile.dietType === 'none' ? 'general healthy' : profile.dietType;
  const systemInstruction = `You are an expert clinical nutrition AI specialized in ${dietDesc} diet, low cholesterol, glycemic control, and heart health.
Generate a nutritionally balanced MONTHLY meal plan (4 weeks, 28 days) in ${lang === 'es' ? 'Spanish' : 'English'} for a user named ${profile.name}.
${profile.countries.length > 0 ? `Adapt the recipes to the culinary culture and typical ingredients of these regions: ${profile.countries.join(", ")}.` : ''}
Strictly follow these rules:
1. Diet style: ${dietDesc}. VARIETY IS KEY. DO NOT REPEAT MEALS.
2. Low cholesterol and low saturated fat.
3. Dietary Restrictions: ${profile.dietaryRestrictions.join(", ")}.
4. ALLERGIES (CRITICAL): ${profile.allergies.join(", ")}. DO NOT include any ingredients the user is allergic to.
5. Avoid forbidden ingredients: ${profile.forbiddenIngredients}.
6. Prioritize: ${profile.preferredIngredients} and ${profile.availableIngredients}.
7. Nutritional targets per day: Adjust based on goals: ${profile.healthGoals.join(", ")}.
8. For each meal, provide a clear preparation time and detailed step-by-step procedures.
9. Each week must have its own shopping list.
10. Provide a general monthly advice.
11. Generate a CATCHY and ATTRACTIVE TITLE for the monthly plan that reflects the culinary influence (e.g., "Odisea Mediterránea: Un Mes de Salud", "El Legado de la Dieta Mediterránea", "30 Días de Sol y Sabor").`;

  const prompt = `User Profile:
Name: ${profile.name}
Age: ${profile.age}
Gender: ${profile.gender}
Weight: ${profile.weight}kg
Height: ${profile.height}cm
Activity Level: ${profile.activityLevel}
Countries/Regions: ${profile.countries.join(", ") || 'International'}
Diet Type: ${profile.dietType}
Goals: ${profile.healthGoals.join(", ")}
Restrictions: ${profile.dietaryRestrictions.join(", ")}
Allergies: ${profile.allergies.join(", ")}

Generate a complete 28-day monthly meal plan (4 weeks) with shopping lists for each week. 
IMPORTANT: To ensure the response fits, keep the "recipe" and "steps" fields CONCISE (max 3-4 short steps per meal). 
Ensure maximum variety and no repetition.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: MONTHLY_PLAN_SCHEMA,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    },
  });

  return JSON.parse(response.text);
}

export async function generateMealImage(mealName: string, description: string): Promise<string> {
  const prompt = `A high-quality, appetizing, professional food photography of a Mediterranean dish: ${mealName}. ${description}. The lighting should be warm and natural, on a clean wooden table or ceramic plate.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated");
}
