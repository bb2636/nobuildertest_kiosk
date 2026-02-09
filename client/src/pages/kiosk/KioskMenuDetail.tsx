import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, type MenuItem } from '../../api/client';
import { useKioskCart } from '../../contexts/KioskCartContext';
import { Button } from '../../components/ui/Button';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

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

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <button type="button" onClick={() => navigate(-1)} className="text-kiosk-text p-2 -ml-2">
          ←
        </button>
        <Link to="/" className="text-lg font-semibold text-kiosk-text">
          FELN
        </Link>
        <Link to="/cart" className="p-2" aria-label="장바구니">
          <ShoppingCart className="h-5 w-5 text-kiosk-text" />
        </Link>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-4">
          <div className="flex gap-4 p-4">
            <div className="w-24 h-24 shrink-0 rounded-md bg-white overflow-hidden flex items-center justify-center relative">
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
                  <span className="hidden absolute inset-0 flex items-center justify-center text-kiosk-textSecondary text-xs bg-white">
                    이미지 없음
                  </span>
                </>
              ) : (
                <span className="text-kiosk-textSecondary text-xs">이미지 없음</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-kiosk-text">{item.name}</h2>
                {item.isBest && (
                  <span className="bg-kiosk-primary text-kiosk-text text-[10px] font-bold px-2 py-0.5 rounded">
                    Best
                  </span>
                )}
              </div>
              {item.englishName && (
                <p className="text-sm text-kiosk-textSecondary mt-0.5">{item.englishName}</p>
              )}
              <p className="text-base font-medium text-kiosk-text mt-1">
                {item.basePrice.toLocaleString()}원
              </p>
            </div>
          </div>

          {isGelato && cupConeOptions.length >= 2 && (
            <div className="px-4 pb-4">
              <p className="text-xs text-kiosk-textSecondary mb-2">컵/콘</p>
              <div className="flex w-full rounded-lg overflow-hidden border border-kiosk-border">
                {cupConeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOption('컵/콘', opt.id)}
                    className={`flex-1 py-2.5 text-sm font-medium ${
                      selectedOptionIds['컵/콘'] === opt.id
                        ? 'bg-kiosk-primary text-kiosk-text'
                        : 'bg-white text-kiosk-textSecondary'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isGelatoOrDessert && (
            <div className="px-4 pb-4">
              <p className="text-xs text-kiosk-textSecondary mb-2">온도</p>
              <div className="flex w-full rounded-lg overflow-hidden border border-kiosk-border">
                <button
                  type="button"
                  onClick={() => setTemperature('HOT')}
                  className={`flex-1 py-2.5 text-sm font-medium ${
                    temperature === 'HOT'
                      ? 'bg-[#e8a0a0] text-[#8b3a3a]'
                      : 'bg-white text-kiosk-textSecondary'
                  }`}
                >
                  HOT
                </button>
                <button
                  type="button"
                  onClick={() => setTemperature('ICED')}
                  className={`flex-1 py-2.5 text-sm font-medium ${
                    temperature === 'ICED'
                      ? 'bg-[#a0c8e8] text-[#2a5a8a]'
                      : 'bg-white text-kiosk-textSecondary'
                  }`}
                >
                  ICED
                </button>
              </div>
            </div>
          )}
        </div>

        {Object.entries(filteredOptionsByType).map(([type, opts]) => {
          if (isGelato && type === '컵/콘') return null;
          if (isShotType(type)) {
            return (
              <div key={type} className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => setOptionModal({ type, opts })}
                  className="w-full flex items-center justify-between text-left"
                >
                  <p className="text-sm font-medium text-kiosk-text">{type.replace(/ \(.*\)/, '')}</p>
                  <span className="text-sm text-kiosk-textSecondary flex items-center gap-1">
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
              <div key={type} className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                <p className="text-sm font-medium text-kiosk-text mb-3">{type}</p>
                <div className="flex flex-wrap gap-2">
                  {opts.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOption(type, opt.id)}
                      className={`rounded-lg px-4 py-2.5 text-sm font-medium border ${
                        selectedOptionIds[type] === opt.id
                          ? 'border-kiosk-text bg-kiosk-surface text-kiosk-text'
                          : 'border-kiosk-border bg-white text-kiosk-textSecondary'
                      }`}
                    >
                      {opt.name}
                      {opt.extraPrice > 0 && ` (+${opt.extraPrice.toLocaleString()}원)`}
                    </button>
                  ))}
                </div>
                {description && (
                  <p className="text-sm text-kiosk-textSecondary mt-3 leading-relaxed whitespace-pre-line">
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
              <div key={type} className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => setOptionModal({ type, opts })}
                  className="w-full flex items-center justify-between text-left"
                >
                  <p className="text-sm font-medium text-kiosk-text">{type}</p>
                  <span className="text-sm text-kiosk-textSecondary flex items-center gap-1">
                    {selectedOpt?.name ?? '선택'}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            );
          }
          return (
            <div key={type} className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <p className="text-sm font-medium text-kiosk-text mb-3">{type}</p>
              <div className="flex flex-wrap gap-2">
                {opts.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOption(type, opt.id)}
                    className={`rounded-lg px-4 py-2.5 text-sm font-medium border ${
                      selectedOptionIds[type] === opt.id
                        ? 'border-kiosk-text bg-kiosk-surface text-kiosk-text'
                        : 'border-kiosk-border bg-white text-kiosk-textSecondary'
                    }`}
                  >
                    {opt.name}
                    {opt.extraPrice > 0 && ` (+${opt.extraPrice.toLocaleString()}원)`}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {item.description && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <p className="text-sm text-kiosk-textSecondary leading-relaxed">{item.description}</p>
          </div>
        )}

        {(isGelato && selectedOptionLabels.length > 0) || !isGelatoOrDessert ? (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <p className="text-xs text-kiosk-textSecondary mb-2">변경된 옵션</p>
            <p className="text-sm text-kiosk-text">
              {isGelato
                ? selectedOptionLabels.join(' · ')
                : [`온도 ${temperature}`, `샷 ${shotCount}`, ...selectedOptionLabels].filter(Boolean).join(' · ')}
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full border border-kiosk-border flex items-center justify-center text-kiosk-text disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center font-medium text-kiosk-text">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-full border border-kiosk-border flex items-center justify-center text-kiosk-text"
            >
              +
            </button>
          </div>
          <span className="font-semibold text-kiosk-text">{totalPrice.toLocaleString()}원</span>
        </div>
      </main>

      <footer className="sticky bottom-0 bg-white border-t border-kiosk-border p-4 safe-area-pb">
        <Button
          theme="kiosk"
          fullWidth
          onClick={item.isSoldOut ? undefined : addToCart}
          disabled={item.isSoldOut}
        >
          {item.isSoldOut ? '품절' : '메뉴 담기'}
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
