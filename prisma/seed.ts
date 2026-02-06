import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const ADMIN_DEFAULT_PASSWORD = "admin123";
const SALT_ROUNDS = 10;

/** 영양정보 7종 [열량, 탄수화물, 당류, 단백질, 지방, 포화지방, 나트륨] */
type NutTuple = [number, number, number, number, number, number, number];

function nutrition(...nut: NutTuple): string {
  return JSON.stringify({ kcal: nut[0], carb: nut[1], sugar: nut[2], protein: nut[3], fat: nut[4], saturatedFat: nut[5], sodium: nut[6] });
}

async function main() {
  // 기존 데이터 삭제 (초기화 후 재배정)
  await prisma.productOption.deleteMany();
  await prisma.orderItemOption.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await (prisma as any).cartItem.deleteMany();
  await (prisma as any).cart.deleteMany();
  await prisma.option.deleteMany();
  await prisma.optionGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // ========== 1. 카테고리 ==========
  const catCoffee = await prisma.category.create({
    data: { name: "커피", isActive: true, sortOrder: 0 },
  });
  const catNonCoffee = await prisma.category.create({
    data: { name: "논커피", isActive: true, sortOrder: 1 },
  });
  const catGelato = await prisma.category.create({
    data: { name: "젤라또", isActive: true, sortOrder: 2 },
  });
  const catDessert = await prisma.category.create({
    data: { name: "디저트", isActive: true, sortOrder: 3 },
  });

  // ========== 2. 커피 메뉴 (이미지 파일명 매칭, 영문명·부가설명 반영) ==========
  const coffeeMenus = [
    { name: "에스프레소", englishName: "Espresso", description: "짧고 진한 풍미의 에스프레소 샷", basePrice: 2500, isBest: false, img: "coffee_espresso.png" },
    { name: "아메리카노", englishName: "Americano", description: "에스프레소에 뜨거운 물을 더한 깔끔한 커피", basePrice: 2500, isBest: true, img: "coffee_americano.png" },
    { name: "카페라떼", englishName: "Caffe Latte", description: "에스프레소에 스팀 밀크를 더한 부드러운 라떼", basePrice: 5000, isBest: true, img: "coffee_cafe_latte.png" },
    { name: "바닐라라떼", englishName: "Vanilla Latte", description: "달콤한 바닐라 시럽이 들어간 라떼", basePrice: 5500, isBest: true, img: "coffee_vanilla_latte.png" },
    { name: "카라멜라떼", englishName: "Caramel Latte", description: "카라멜 시럽이 어우러진 달콤한 라떼", basePrice: 5500, isBest: false, img: "coffee_caramel_latte.png" },
    { name: "헤이즐넛라떼", englishName: "Hazelnut Latte", description: "헤이즐넛 시럽이 들어간 향긋한 라떼", basePrice: 5500, isBest: false, img: "coffee_hazelnut_latte.png" },
    { name: "모카라떼", englishName: "Mocha Latte", description: "초콜릿과 커피가 조화를 이루는 풍부한 모카 라떼", basePrice: 2500, isBest: false, img: "coffee_mocha_latte.png" },
    { name: "연유라떼", englishName: "Condensed Milk Latte", description: "진한 연유의 달콤함이 더해진 라떼", basePrice: 2500, isBest: false, img: "coffee_condensed_milk_latte.png" },
    { name: "카푸치노", englishName: "Cappuccino", description: "우유 거품이 풍성한 클래식 카푸치노", basePrice: 5000, isBest: false, img: "coffee_cappuccino.png" },
  ];

  const coffeeProducts = await Promise.all(
    coffeeMenus.map((m, i) =>
      prisma.product.create({
        data: {
          categoryId: catCoffee.id,
          name: m.name,
          englishName: m.englishName,
          description: m.description,
          basePrice: m.basePrice,
          imageUrl: `/images/${m.img}`,
          isBest: m.isBest,
          defaultShotCount: 2, // 커피 기본 2샷, 추가 시 2+n 표시
          sortOrder: i,
        } as Prisma.ProductUncheckedCreateInput,
      })
    )
  );

  // ========== 3. 논커피 메뉴 (이미지 파일명 매칭, 영문명·부가설명 반영) ==========
  const nonCoffeeMenus = [
    { name: "인절미라떼", englishName: "Injeolmi Latte", description: "고소한 콩고물과 인절미가 어우러진 부드러운 라떼", basePrice: 5200, isBest: false, img: "non-coffee_injeolmi_latte.png" },
    { name: "흑임자라떼", englishName: "Black Sesame Latte", description: "진하고 고소한 흑임자 맛의 라떼", basePrice: 5200, isBest: false, img: "non-coffee_black_sesame_latte.png" },
    { name: "말차라떼", englishName: "Matcha Latte", description: "진한 말차와 우유가 어우러진 깔끔한 라떼", basePrice: 5200, isBest: true, img: "non-coffee_matcha_latte.png" },
    { name: "스트로베리라떼", englishName: "Strawberry Latte", description: "생딸기 퓨레와 우유가 층을 이루는 상큼한 라떼", basePrice: 5400, isBest: true, img: "non-coffee_strawberry_latte.png" },
    { name: "고구마라떼", englishName: "Sweet Potato Latte", description: "달콤한 고구마 페이스트가 들어간 따뜻한 라떼", basePrice: 5200, isBest: false, img: "non-coffee_sweet_potato_latte.png" },
    { name: "초코라떼", englishName: "Chocolate Latte", description: "진한 초콜릿과 우유가 어우러진 부드러운 라떼", basePrice: 5200, isBest: true, img: "non-coffee_choco_latte.png" },
    { name: "로즈베리티", englishName: "Roseberry Tea", description: "로즈와 베리 향이 어우러진 은은한 허브티", basePrice: 4800, isBest: false, img: "non-coffee_roseberry_tea.png" },
    { name: "캐모마일티", englishName: "Chamomile Tea", description: "마음을 편안하게 해주는 캐모마일 허브티", basePrice: 4800, isBest: true, img: "non-coffee_chamomile_tea.png" },
    { name: "얼그레이 밀크티", englishName: "Earl Grey Milk Tea", description: "얼그레이 홍차에 우유를 더한 은은한 밀크티", basePrice: 5200, isBest: true, img: "non-coffee_earl_grey_milk_tea.png" },
  ];

  const nonCoffeeProducts = await Promise.all(
    nonCoffeeMenus.map((m, i) =>
      prisma.product.create({
        data: {
          categoryId: catNonCoffee.id,
          name: m.name,
          englishName: m.englishName,
          description: m.description,
          basePrice: m.basePrice,
          imageUrl: `/images/${m.img}`,
          isBest: m.isBest,
          sortOrder: i,
        },
      })
    )
  );

  // ========== 4. 젤라또 메뉴 (원재료·영양정보 포함) ==========
  const gelatoMenus = [
    { name: "바닐라 젤라또", englishName: "Vanilla Gelato", description: "바닐라 풍미가 진한 젤라또 아이스크림", ingredients: "우유, 바닐라빈, 계란, 설탕", nut: [190, 22, 15, 4, 9, 5, 50], basePrice: 5500, isBest: false, img: "gelato_vanilla_gelato.png" },
    { name: "말차 젤라또", englishName: "Matcha Gelato", description: "부드럽고 진한 말차맛 젤라또", ingredients: "우유, 말차가루, 계란, 설탕", nut: [210, 24, 14, 5, 10, 6, 55], basePrice: 5500, isBest: false, img: "gelato_matcha_gelato.png" },
    { name: "초코 젤라또", englishName: "Chocolate Gelato", description: "고급스러운 다크초콜릿으로 만든 초코 젤라또", ingredients: "우유, 코코아, 초콜릿, 설탕", nut: [220, 25, 16, 4, 12, 7, 60], basePrice: 5500, isBest: true, img: "gelato_choco_gelato.png" },
    { name: "피넛버터 젤라또", englishName: "Peanut Butter Gelato", description: "고소한 땅콩버터가 듬뿍 들어간 진한 젤라또", ingredients: "우유, 땅콩버터, 설탕, 크림", nut: [240, 20, 17, 5, 6, 6, 200], basePrice: 5500, isBest: false, img: "gelato_peanut_butter_gelato.png" },
    { name: "흑임자 젤라또", englishName: "Black Sesame Gelato", description: "깊고 고소한 흑임자 풍미의 젤라또", ingredients: "우유, 흑임자, 설탕, 크림", nut: [230, 22, 15, 5, 13, 7, 190], basePrice: 5500, isBest: false, img: "gelato_black_sesame_gelato.png" },
    { name: "쿠키앤크림 젤라또", englishName: "Cookies & Cream Gelato", description: "바닐라 젤라또에 쿠키 조각이 더해진 달콤한 맛", ingredients: "우유, 쿠키 크림, 바닐라, 설탕", nut: [250, 26, 18, 4, 15, 8, 210], basePrice: 5500, isBest: false, img: "gelato_cookies_and_cream_gelato.png" },
    { name: "레드베리 젤라또", englishName: "Red Berry Gelato", description: "상큼한 베리류의 맛이 어우러진 달콤한 젤라또", ingredients: "우유, 베리믹스, 설탕", nut: [200, 23, 17, 3, 8, 5, 140], basePrice: 5500, isBest: false, img: "gelato_red_berry_gelato.png" },
    { name: "인절미 젤라또", englishName: "Injeolmi Gelato", description: "인절미와 콩고물이 어우러진 달콤한 젤라또", ingredients: "우유, 인절미, 콩고물, 설탕", nut: [210, 21, 10, 4, 11, 6, 150], basePrice: 5500, isBest: false, img: "gelato_injeolmi_gelato.png" },
    { name: "얼그레이 젤라또", englishName: "Earl Grey Gelato", description: "얼그레이 홍차 향이 은은하게 나는 밀크 젤라또", ingredients: "우유, 얼그레이잎, 설탕, 크림", nut: [200, 22, 12, 4, 10, 6, 130], basePrice: 5500, isBest: false, img: "gelato_earl_grey_gelato.png" },
  ];

  await Promise.all(
    gelatoMenus.map((m, i) =>
      prisma.product.create({
        data: {
          categoryId: catGelato.id,
          name: m.name,
          englishName: m.englishName,
          description: m.description,
          ingredients: m.ingredients,
          calories: nutrition(...(m.nut as NutTuple)),
          basePrice: m.basePrice,
          imageUrl: `/images/${m.img}`,
          isBest: m.isBest,
          sortOrder: i,
        } as Prisma.ProductUncheckedCreateInput,
      })
    )
  );

  // ========== 5. 디저트 메뉴 (원재료·영양정보 포함) ==========
  const dessertMenus = [
    { name: "크로와상", englishName: "Croissant", description: "겹겹이 결이 살아 있는 프렌치 스타일 크로와상", ingredients: "밀가루, 버터, 우유, 계란, 설탕", nut: [270, 28, 6, 5, 14, 8, 230], basePrice: 4200, isBest: false, img: "dessert_croissant.png" },
    { name: "레몬 파운드", englishName: "Lemon Pound Cake", description: "상큼한 레몬 향이 가득한 촉촉한 파운드 케이크", ingredients: "밀가루, 버터, 달걀, 레몬즙, 설탕", nut: [300, 32, 20, 4, 16, 9, 180], basePrice: 5500, isBest: false, img: "dessert_lemon_pound_cake.png" },
    { name: "시나몬롤", englishName: "Cinnamon Roll", description: "달콤한 시나몬과 설탕이 가득한 부드러운 시나몬롤", ingredients: "밀가루, 계피, 설탕, 우유, 버터", nut: [380, 45, 25, 6, 18, 10, 250], basePrice: 5600, isBest: false, img: "dessert_cinnamon_roll.png" },
    { name: "치즈 케이크", englishName: "Cheesecake", description: "꾸덕하고 진한 풍미의 베이크드 치즈 케이크", ingredients: "크림치즈, 밀가루, 계란, 버터, 설탕", nut: [310, 27, 20, 6, 20, 12, 220], basePrice: 5500, isBest: false, img: "dessert_cheese_cake.png" },
    { name: "크림치즈 스콘", englishName: "Cream Cheese Scone", description: "크림치즈가 들어간 부드럽고 담백한 스콘", ingredients: "밀가루, 크림치즈, 우유, 설탕", nut: [290, 29, 8, 5, 17, 10, 200], basePrice: 5200, isBest: true, img: "dessert_cream_cheese_scone.png" },
    { name: "티라미수", englishName: "Tiramisu", description: "에스프레소와 마스카포네 치즈가 어우러진 티라미수", ingredients: "마스카포네, 에스프레소, 계란, 설탕, 카카오파우더", nut: [320, 30, 18, 6, 19, 11, 160], basePrice: 5500, isBest: false, img: "dessert_tiramisu.png" },
    { name: "말차크림롤", englishName: "Matcha Cream Roll", description: "말차 크림이 가득 들어간 부드러운 롤케이크", ingredients: "밀가루, 말차, 우유, 계란, 설탕", nut: [270, 28, 18, 5, 13, 7, 180], basePrice: 5500, isBest: false, img: "dessert_matcha_cream_roll.png" },
    { name: "브라우니", englishName: "Brownie", description: "쫀득하고 진한 초콜릿 맛의 브라우니", ingredients: "초콜릿, 버터, 밀가루, 계란, 설탕", nut: [350, 30, 20, 4, 22, 13, 170], basePrice: 5500, isBest: true, img: "dessert_brownie.png" },
    { name: "피칸파이", englishName: "Pecan Pie", description: "카라멜에 절인 피칸이 가득 들어간 달콤한 파이", ingredients: "밀가루, 피칸, 시럽, 계란, 버터", nut: [400, 38, 26, 5, 25, 14, 200], basePrice: 5500, isBest: false, img: "dessert_pecan_pie.png" },
  ];

  await Promise.all(
    dessertMenus.map((m, i) =>
      prisma.product.create({
        data: {
          categoryId: catDessert.id,
          name: m.name,
          englishName: m.englishName,
          description: m.description,
          ingredients: m.ingredients,
          calories: nutrition(...(m.nut as NutTuple)),
          basePrice: m.basePrice,
          imageUrl: `/images/${m.img}`,
          isBest: m.isBest,
          sortOrder: i,
        } as Prisma.ProductUncheckedCreateInput,
      })
    )
  );

  // ========== 6. 옵션 그룹 & 옵션 생성 (기존 코드 유지) ==========
  const groupBean = await prisma.optionGroup.create({
    data: {
      name: "원두",
      sortOrder: 0,
      options: {
        create: [
          { name: "기본", defaultExtraPrice: 0, sortOrder: 0 },
          { name: "블론드", defaultExtraPrice: 0, sortOrder: 1 },
          { name: "디카페인", defaultExtraPrice: 0, sortOrder: 2 },
        ],
      },
    },
    include: { options: true },
  });

  const groupShot = await prisma.optionGroup.create({
    data: {
      name: "샷 (기본 2샷)",
      sortOrder: 1,
      options: {
        create: [{ name: "1샷 추가 (+800원)", defaultExtraPrice: 800, sortOrder: 0 }],
      },
    },
    include: { options: true },
  });

  const groupMilk = await prisma.optionGroup.create({
    data: {
      name: "우유",
      sortOrder: 2,
      options: {
        create: [
          { name: "기본우유", defaultExtraPrice: 0, sortOrder: 0 },
          { name: "아몬드 우유", defaultExtraPrice: 500, sortOrder: 1 },
          { name: "오트 우유", defaultExtraPrice: 500, sortOrder: 2 },
          { name: "두유", defaultExtraPrice: 500, sortOrder: 3 },
        ],
      },
    },
    include: { options: true },
  });

  const groupSyrup = await prisma.optionGroup.create({
    data: {
      name: "시럽",
      sortOrder: 3,
      options: {
        create: [
          { name: "시럽없이", defaultExtraPrice: 0, sortOrder: 0 },
          { name: "헤이즐넛 시럽", defaultExtraPrice: 500, sortOrder: 1 },
          { name: "바닐라 시럽", defaultExtraPrice: 500, sortOrder: 2 },
          { name: "카라멜 시럽", defaultExtraPrice: 500, sortOrder: 3 },
        ],
      },
    },
    include: { options: true },
  });

  const groupWhipping = await prisma.optionGroup.create({
    data: {
      name: "휘핑크림",
      sortOrder: 4,
      options: {
        create: [
          { name: "없이", defaultExtraPrice: 0, sortOrder: 0 },
          { name: "적게", defaultExtraPrice: 0, sortOrder: 1 },
          { name: "보통", defaultExtraPrice: 0, sortOrder: 2 },
          { name: "많이", defaultExtraPrice: 0, sortOrder: 3 },
        ],
      },
    },
    include: { options: true },
  });

  const coffeeOptionIds = [
    ...groupBean.options.map((o) => o.id),
    ...groupShot.options.map((o) => o.id),
    ...groupMilk.options.map((o) => o.id),
    ...groupSyrup.options.map((o) => o.id),
  ];

  const nonCoffeeOptionIds = [
    ...groupMilk.options.map((o) => o.id),
    ...groupSyrup.options.map((o) => o.id),
    ...groupWhipping.options.map((o) => o.id),
  ];

  // ========== 7. 상품 ↔ 옵션 연결 ==========
  for (const product of coffeeProducts) {
    await prisma.productOption.createMany({
      data: coffeeOptionIds.map((optionId) => ({
        productId: product.id,
        optionId,
      })),
    });
  }

  for (const product of nonCoffeeProducts) {
    await prisma.productOption.createMany({
      data: nonCoffeeOptionIds.map((optionId) => ({
        productId: product.id,
        optionId,
      })),
    });
  }

  // 기본 관리자 계정 1개 (회원가입 불가, 시드로만 생성)
  const adminHash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, SALT_ROUNDS);
  await (prisma as any).user.upsert({
    where: { username: "admin" },
    create: {
      name: "관리자",
      username: "admin",
      email: "admin@localhost",
      password: adminHash,
      role: "ADMIN",
    },
    update: {},
  });

  // 약관/개인정보처리방침 초기 문서 (없으면 빈 문자열로 생성)
  await (prisma as any).siteContent.upsert({
    where: { key: "terms" },
    create: { key: "terms", content: "" },
    update: {},
  });
  await (prisma as any).siteContent.upsert({
    where: { key: "privacy" },
    create: { key: "privacy", content: "" },
    update: {},
  });

  console.log("Seed 완료: 이미지 매칭 및 모든 데이터가 정상 삽입되었습니다. (관리자: admin / " + ADMIN_DEFAULT_PASSWORD + ")");
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });