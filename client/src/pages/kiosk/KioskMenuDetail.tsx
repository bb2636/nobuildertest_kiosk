import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, type MenuItem } from '../../api/client';
import { useKioskCart } from '../../contexts/KioskCartContext';
import { Button } from '../../components/ui/Button';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { parseCalories } from '../../utils/parseCalories';

type OptionRow = { id: string; name: string; type: string; extraPrice: number };

const BEAN_DESCRIPTIONS: Record<string, string> = {
  기본:
    '고소하고 부드러운 산미에 균형 잡힌 바디감이 특징이에요. 진한 커피의 느낌을 원하시거나, 라떼와 어울리는 원두를 찾는 분께 추천드려요.\n고소함 · 미디엄 바디 · 은은한 산미 · 부드러운 끝맛',
  블론드:
    '밝은 로스팅으로 은은한 산미와 가벼운 바디감이 특징이에요. 과일·플로럴 노트를 즐기시거나 부드러운 커피를 선호하시는 분께 추천드려요.\n은은한 산미 · 라이트 바디 · 달큰한 끝맛',
  디카페인:
    '카페인을 최대한 줄인 원두로, 깊은 맛과 풍미는 그대로 느끼실 수 있어요. 저녁에도 커피를 즐기고 싶은 분께 추천드려요.\n고소함 · 부드러운 바디 · 깔끔한 끝맛',
};

export function KioskMenuDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { add } = useKioskCart();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptionIds, setSelectedOptionIds] = useState<Record<string, string>>({});
  const [temperature, setTemperature] = useState<'HOT' | 'ICED'>('HOT');
  const [shotCount, setShotCount] = useState(2);
  const [optionModal, setOptionModal] = useState<{ type: string; opts: OptionRow[] } | null>(null);

  const defaultShots = item?.defaultShotCount ?? 2;
  const shotOption = item?.options.find((o) => o.type.includes('샷') && o.extraPrice > 0);

  useEffect(() => {
    if (!itemId) return;
    api.menu.get(itemId).then(setItem).catch(() => setItem(null));
  }, [itemId]);

  useEffect(() => {
    if (!item) return;
    const catName = item.category?.name ?? '';
    const isGelatoCat = catName === '젤라또';
    const isDessertCat = catName === '디저트';
    setShotCount(item.defaultShotCount ?? 2);
    if (isDessertCat) {
      setSelectedOptionIds({});
      return;
    }
    const byType = item.options.reduce<Record<string, OptionRow[]>>((acc, opt) => {
      const key = opt.type;
      if (!acc[key]) acc[key] = [];
      acc[key]!.push({ id: opt.id, name: opt.name, type: opt.type, extraPrice: opt.extraPrice });
      return acc;
    }, {});
    if (isGelatoCat) {
      const cupCone = byType['컵/콘'];
      setSelectedOptionIds(cupCone?.[0] ? { '컵/콘': cupCone[0].id } : {});
      return;
    }
    const initial: Record<string, string> = {};
    Object.entries(byType).forEach(([type, opts]) => {
      if (opts[0]) initial[type] = opts[0].id;
    });
    setSelectedOptionIds(initial);
  }, [item?.id]);

  if (!item) {
    return (
      <div className="p-4">
        <p className="text-kiosk-textSecondary">메뉴를 불러오는 중...</p>
      </div>
    );
  }

  const categoryName = item.category?.name ?? '';
  const isGelato = categoryName === '젤라또';
  const isDessert = categoryName === '디저트';
  const isGelatoOrDessert = isGelato || isDessert;

  const optionsByTypeRaw = item.options.reduce<Record<string, OptionRow[]>>((acc, opt) => {
    const key = opt.type;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push({ id: opt.id, name: opt.name, type: opt.type, extraPrice: opt.extraPrice });
    return acc;
  }, {});
  /** 디저트: 옵션 없음. 젤라또: 컵/콘만. 그 외: 전체 옵션 */
  const filteredOptionsByType = isDessert
    ? {}
    : isGelato
      ? { '컵/콘': optionsByTypeRaw['컵/콘'] ?? [] }
      : optionsByTypeRaw;

  const isShotType = (t: string) => t.includes('샷');
  const isBeanType = (t: string) => t === '원두';
  const isMilkOrSyrup = (t: string) => t === '우유' || t === '시럽';

  const extraShots = isGelatoOrDessert ? 0 : Math.max(0, shotCount - defaultShots);
  const shotExtraPrice = isGelatoOrDessert ? 0 : (shotOption ? shotOption.extraPrice * extraShots : 0);
  const cupConeOptionId = isGelato ? selectedOptionIds['컵/콘'] : undefined;
  const cupConeOptions = optionsByTypeRaw['컵/콘'] ?? [];
  const selectedIdsForCart = isDessert
    ? []
    : isGelato
      ? cupConeOptionId ? [cupConeOptionId] : cupConeOptions[0] ? [cupConeOptions[0].id] : []
      : (() => {
          const ids = Object.entries(selectedOptionIds)
            .filter(([type]) => !type.includes('샷'))
            .map(([, id]) => id);
          if (shotOption && extraShots > 0) {
            for (let i = 0; i < extraShots; i++) ids.push(shotOption.id);
          }
          return ids;
        })();
  const optionExtra = selectedIdsForCart.reduce((sum, id) => {
    const opt = item.options.find((o) => o.id === id);
    return sum + (opt?.extraPrice ?? 0);
  }, 0);
  const unitPrice = item.basePrice + optionExtra + shotExtraPrice;
  const totalPrice = unitPrice * quantity;

  const setOption = (type: string, optionId: string) => {
    setSelectedOptionIds((prev) => ({ ...prev, [type]: optionId }));
    setOptionModal(null);
  };

  const addToCart = () => {
    add({
      productId: item.id,
      name: item.name,
      quantity,
      optionIds: selectedIdsForCart,
      unitPrice,
    });
    navigate('/');
  };

  const selectedOptionLabels = isDessert
    ? []
    : isGelato
      ? cupConeOptionId
        ? (() => {
            const opt = item.options.find((o) => o.id === cupConeOptionId);
            return opt ? [opt.name] : [];
          })()
        : []
      : (Object.entries(selectedOptionIds)
          .filter(([type, id]) => id && !isShotType(type))
          .map(([type, id]) => {
            const opt = item.options.find((o) => o.id === id);
            return opt ? `${type.replace(/ \(.*\)/, '')} ${opt.name}` : null;
          })
          .filter(Boolean) as string[]);

  const nutrition = parseCalories(item.calories);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)} className="text-black p-2 -ml-2 text-xl">
          ←
        </button>
        <Link to="/" className="text-lg font-semibold text-black">
          FELN
        </Link>
        <Link to="/cart" className="p-2" aria-label="장바구니">
          <ShoppingCart className="h-5 w-5 text-black" />
        </Link>
      </header>

      <main className="flex-1 overflow-auto">
        {/* 젤라또/디저트: 왼쪽 원형 이미지 + 오른쪽 정보, 컵/콘 토글, 영양정보 */}
        {isGelatoOrDessert && (
          <div className="p-4 md:p-6">
            <div className="flex gap-4 mb-4">
              <div className="w-24 h-24 shrink-0 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center relative">
                {item.images[0]?.url ? (
                  <>
                    <img
                      src={item.images[0].url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <span className="hidden absolute inset-0 flex items-center justify-center text-gray-400 text-xs bg-white">
                      이미지 없음
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 text-xs">이미지 없음</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-black">{item.name}</h2>
                  {item.isBest && (
                    <span className="bg-[#FFC107] text-white text-xs font-bold px-2 py-0.5 rounded">
                      Best
                    </span>
                  )}
                </div>
                {item.englishName && (
                  <p className="text-sm text-gray-500 mt-0.5">{item.englishName}</p>
                )}
                <p className="text-lg font-bold text-black mt-1">
                  {item.basePrice.toLocaleString()}원
                </p>
              </div>
            </div>

            {isGelato && cupConeOptions.length >= 2 && (
              <div className="flex rounded-full bg-gray-100 p-0.5 border border-gray-200 mb-4">
                {cupConeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOption('컵/콘', opt.id)}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-full ${
                      selectedOptionIds['컵/콘'] === opt.id
                        ? 'bg-white text-black border border-gray-300 shadow-sm'
                        : 'text-gray-500'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            )}

            {nutrition && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-black">영양정보</h3>
                <p className="text-xs text-gray-500 mt-0.5">1회 제공량 : 120g (약 1컵 분량)</p>
                <div className="mt-2 border-t border-gray-200 divide-y divide-gray-100">
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">열량</span>
                    <span className="text-black">{nutrition.kcal}kcal</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">탄수화물</span>
                    <span className="text-black">{nutrition.carb}g(11%)</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">당류</span>
                    <span className="text-black">{nutrition.sugar}g</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">단백질</span>
                    <span className="text-black">{nutrition.protein}g(7%)</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">지방</span>
                    <span className="text-black">{nutrition.fat}g(30%)</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">포화지방</span>
                    <span className="text-black">{nutrition.saturatedFat}g</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 커피 등: 상단 큰 이미지, 이름·설명·가격, 온도·원두·옵션 행 */}
        {!isGelatoOrDessert && (
          <>
            <div className="w-full aspect-[4/3] max-h-56 bg-gray-100 flex items-center justify-center overflow-hidden">
              {item.images[0]?.url ? (
                <img
                  src={item.images[0].url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-gray-400 text-sm">이미지 없음</span>
              )}
            </div>
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-black">{item.name}</h2>
                {item.isBest && (
                  <span className="bg-[#FFC107] text-black text-xs font-bold px-2 py-0.5 rounded">
                    Best
                  </span>
                )}
              </div>
              {item.englishName && (
                <p className="text-sm text-gray-500 mt-0.5">{item.englishName}</p>
              )}
              {item.description && (
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{item.description}</p>
              )}
              <p className="text-lg font-bold text-black mt-2">
                {item.basePrice.toLocaleString()}원
              </p>

              <div className="flex rounded-full bg-gray-100 p-0.5 border border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={() => setTemperature('HOT')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-full ${
                    temperature === 'HOT'
                      ? 'bg-white text-red-600 border border-gray-200 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  HOT
                </button>
                <button
                  type="button"
                  onClick={() => setTemperature('ICED')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-full ${
                    temperature === 'ICED'
                      ? 'bg-gray-200 text-blue-600'
                      : 'text-gray-500'
                  }`}
                >
                  ICED
                </button>
              </div>
            </div>
          </>
        )}

        {!isGelatoOrDessert &&
          Object.entries(filteredOptionsByType).map(([type, opts]) => {
            if (isShotType(type)) {
              return (
                <div key={type} className="px-4 md:px-6 pb-3">
                  <button
                    type="button"
                    onClick={() => setOptionModal({ type, opts })}
                    className="w-full flex items-center justify-between text-left py-2 border-b border-gray-100"
                  >
                    <p className="text-sm font-medium text-black">{type.replace(/ \(.*\)/, '')}</p>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      기본 {shotCount}샷
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              );
            }
            if (isBeanType(type)) {
              const selectedId = selectedOptionIds[type];
              const selectedOpt = opts.find((o) => o.id === selectedId);
              const descKey = selectedOpt?.name?.split(' ')[0] ?? selectedOpt?.name ?? '';
              const description = BEAN_DESCRIPTIONS[descKey];
              return (
                <div key={type} className="px-4 md:px-6 pb-4">
                  <p className="text-sm font-medium text-black mb-3">{type}</p>
                  <div className="flex gap-2 flex-wrap">
                    {opts.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setOption(type, opt.id)}
                        className={`rounded-lg px-4 py-2.5 text-sm font-medium border min-w-[80px] ${
                          selectedOptionIds[type] === opt.id
                            ? 'border-black bg-white text-black'
                            : 'border-gray-200 bg-gray-100 text-gray-600'
                        }`}
                      >
                        <span className="block font-medium">{opt.name.split(' ')[0] ?? opt.name}</span>
                        <span className="block text-xs opacity-80">
                          {opt.name.includes(' ') ? opt.name.split(' ').slice(1).join(' ') : ''}
                        </span>
                        {opt.extraPrice > 0 && (
                          <span className="text-xs">+{opt.extraPrice.toLocaleString()}원</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {description && (
                    <p className="text-sm text-gray-500 mt-3 leading-relaxed whitespace-pre-line">
                      {description}
                    </p>
                  )}
                </div>
              );
            }
            if (isMilkOrSyrup(type)) {
              const selectedId = selectedOptionIds[type];
              const selectedOpt = opts.find((o) => o.id === selectedId);
              return (
                <div key={type} className="px-4 md:px-6 pb-3">
                  <button
                    type="button"
                    onClick={() => setOptionModal({ type, opts })}
                    className="w-full flex items-center justify-between text-left py-2 border-b border-gray-100"
                  >
                    <p className="text-sm font-medium text-black">{type}</p>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      {selectedOpt?.name ?? '선택'}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              );
            }
            return null;
          })}

        {((isGelato && selectedOptionLabels.length > 0) || !isGelatoOrDessert) && (
          <div className="px-4 md:px-6 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">변경된 옵션</p>
            <p className="text-sm text-black">
              {isGelato
                ? selectedOptionLabels.join(' · ')
                : [`온도 ${temperature}`, `샷 ${shotCount}`, ...selectedOptionLabels].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-black disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center font-medium text-black">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-black"
            >
              +
            </button>
          </div>
          <span className="text-lg font-bold text-black">{totalPrice.toLocaleString()}원</span>
        </div>
      </main>

      <footer className="sticky bottom-0 bg-white border-t border-gray-200 p-4 md:p-6 safe-area-pb">
        <Button
          theme="kiosk"
          fullWidth
          onClick={item.isSoldOut ? undefined : addToCart}
          disabled={item.isSoldOut}
          className="bg-[#FFC107] text-black font-bold hover:bg-amber-400"
        >
          {item.isSoldOut ? '품절' : isGelatoOrDessert ? '담기' : '메뉴 담기'}
        </Button>
      </footer>

      {optionModal && (
        <Modal
          open={!!optionModal}
          onClose={() => setOptionModal(null)}
          title={optionModal.type.replace(/ \(.*\)/, '')}
        >
          {isShotType(optionModal.type) ? (
            <div>
              <p className="text-sm text-kiosk-textSecondary mb-4">
                에스프레소를 커스텀으로 즐겨보세요!
              </p>
              <div className="flex items-center justify-between">
                <span className="text-kiosk-text">에스프레소 샷</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShotCount((c) => Math.max(1, c - 1))}
                    className="w-9 h-9 rounded-full border border-kiosk-border flex items-center justify-center text-kiosk-text"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-medium">{shotCount}</span>
                  <button
                    type="button"
                    onClick={() => setShotCount((c) => Math.min(6, c + 1))}
                    className="w-9 h-9 rounded-full border border-kiosk-border flex items-center justify-center text-kiosk-text"
                  >
                    +
                  </button>
                </div>
              </div>
              <Button theme="kiosk" fullWidth className="mt-6" onClick={() => setOptionModal(null)}>
                적용하기
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {optionModal.opts.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOption(optionModal.type, opt.id)}
                  className={`w-full text-left rounded-lg px-4 py-3 text-sm font-medium border ${
                    selectedOptionIds[optionModal.type] === opt.id
                      ? 'border-kiosk-primary bg-kiosk-surface text-kiosk-text'
                      : 'border-kiosk-border bg-white text-kiosk-textSecondary'
                  }`}
                >
                  {opt.name}
                  {opt.extraPrice > 0 && ` +${opt.extraPrice.toLocaleString()}원`}
                </button>
              ))}
              <Button theme="kiosk" fullWidth className="mt-4" onClick={() => setOptionModal(null)}>
                적용하기
              </Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
