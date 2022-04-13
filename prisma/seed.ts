import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  const email = "lucas@gmail.com";
  // cleanup the existing database
  await prisma.user.delete({ where: { email } }).catch(() => {
    // no worries if it doesn't exist yet
  });
  await prisma.category.deleteMany({});
  await prisma.ingredient.deleteMany({});
  await prisma.recipe.deleteMany({});
  console.log("Deleted old seed data");

  const hashedPassword = await bcrypt.hash("lucasiscool", 10);

  const lucas = await prisma.user.create({
    data: {
      email,
      firstName: "Lucas",
      lastName: "Homer",
      role: "ADMIN",
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });

  console.log(`Created User: ${lucas.firstName}, Role: ${lucas.role}`);

  // Category
  const categoryNames = [
    "appetizer",
    "beverage",
    "bread",
    "breakfast",
    "cake",
    "candy",
    "dessert",
    "entree",
    "preserve",
    "sauce",
    "side",
    "salad",
  ];
  const categories = await prisma.category.createMany({
    data: categoryNames.map((name) => {
      return {
        name,
      };
    }),
  });
  console.log(`Created ${categories.count} Categories`);

  const breakfast = await prisma.category.findFirst({
    where: { name: "breakfast" },
  });
  const side = await prisma.category.findFirst({
    where: { name: "side" },
  });

  // Recipe
  const omelette = await prisma.recipe.create({
    data: {
      title: "Omelette du fromage",
      userId: lucas.id,
      servings: "One",
      instructions:
        "Whisk eggs, add a smidge of water, pinch salt, and heat skillet on medium-high. Melt knob of butter in skillet, then cook egg mixture in pan, teasing the sides and stuff you know? Youtube it. As the bottom layer of egg sets, sprinkle cheese on top and let melt a moment. Tease and fold the left third of the omelette over onto the middle third, then fold that over onto the right third of the omelette. Serve with fresh cracked black pepper.",
      categories: {
        connect: {
          id: breakfast?.id,
        },
      },
      ingredients: {
        createMany: {
          data: [
            {
              name: "eggs, whisked",
              quantity: "Two",
            },
            {
              name: "shredded cheese",
              quantity: "1/8 cup",
            },
          ],
        },
      },
    },
  });

  const instantPotBeans = await prisma.recipe.create({
    data: {
      title: "Instant-pot beans",
      userId: lucas.id,
      instructions:
        "After sorting out the gross wrinkled or broken beans, rinse the beans and put in a pot of water filled two inches higher than the beans. Add chipotle pepper, garlic, and bouillon paste to water and stir to combine. Set Instant Pot to high pressure for 35 minutes. Let pressure release naturally, probably 15 or 20 minutes.",

      categories: {
        connect: {
          id: side?.id,
        },
      },
      servings: "4 to 6",
      ingredients: {
        createMany: {
          data: [
            {
              name: "dry pinto or black beans",
              quantity: "1 lb",
            },
            {
              name: "cloves garlic, minced",
              quantity: "Three",
            },
            {
              name: "chipotle pepper in adobo, minced",
              quantity: "One",
            },
            {
              name: "Better Than Bouillon paste",
              quantity: "1 tablespoon",
            },
          ],
        },
      },
    },
  });

  console.log("omelette", omelette);
  console.log("beans", instantPotBeans);

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
