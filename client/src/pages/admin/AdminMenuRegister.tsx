import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';

const NAME_MAX = 30;

/** 디저트류: 영양정보 입력 노출 (카테고리 이름 기준) */
const DESSERT_CATEGORY_NAMES = ['디저트', '베이커리'];

const NUTRITION_KEYS: { key: keyof NutritionValues; label: string }[] = [
  { key: 'kcal', label: '열량' },
  { key: 'carb', label: '탄수화물' },
  { key: 'sugar', label: '당류' },
  { key: 'protein', label: '단백질' },
  { key: 'fat', label: '지방' },
  { key: 'saturatedFat', label: '포화지방' },
  { key: 'sodium', label: '나트륨' },
];

type NutritionValues = {
  kcal: string;
  carb: string;
  sugar: string;
  protein: string;
  fat: string;
  saturatedFat: string;
  sodium: string;
};

const emptyNutrition = (): NutritionValues => ({
  kcal: '',
  carb: '',
  sugar: '',
  protein: '',
  fat: '',
  saturatedFat: '',
  sodium: '',
});

function nutritionToJson(values: NutritionValues): string | undefined {
  const o: Record<string, number> = {};
  for (const { key } of NUTRITION_KEYS) {
    const v = values[key].trim();
    if (!v) continue;
    const num = parseFloat(v.replace(/,/g, ''));
    if (!Number.isNaN(num)) o[key] = num;
  }
  return Object.keys(o).length > 0 ? JSON.stringify(o) : undefined;
}

type CategoryItem = { id: string; name: string; sortOrder: number };
type OptionGroupItem = {
  id: string;
  name: string;
  sortOrder: number;
  options: { id: string; name: string; defaultExtraPrice: number; sortOrder: number }[];
};

export function AdminMenuRegister() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroupItem[]>([]);

  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [nutrition, setNutrition] = useState<NutritionValues>(emptyNutrition());
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set());

  const [useDefaultOptions, setUseDefaultOptions] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /** 새 옵션 추가 (기본값 미사용 시): 그룹 선택, 옵션명, 추가금액 */
  const [newOptionGroupId, setNewOptionGroupId] = useState('');
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [addingOption, setAddingOption] = useState(false);
  const [optionAddError, setOptionAddError] = useState('');

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isDessertCategory = Boolean(
    selectedCategory && DESSERT_CATEGORY_NAMES.some((n) => selectedCategory.name === n || selectedCategory.name.includes(n))
  );

  const loadCategories = useCallback(() => {
    api.admin.categories.list().then((list) => {
      setCategories(list);
      if (list.length > 0 && !categoryId) setCategoryId(list[0]?.id ?? '');
    });
  }, []);
  const loadOptionGroups = useCallback(() => {
    api.admin.optionGroups.list().then(setOptionGroups);
  }, []);

  useEffect(() => {
    loadCategories();
    loadOptionGroups();
  }, [loadCategories, loadOptionGroups]);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) setCategoryId(categories[0]?.id ?? '');
  }, [categories, categoryId]);

  useEffect(() => {
    if (!useDefaultOptions || !categoryId) return;
    api.admin.categories.getDefaultOptions(categoryId).then(({ optionIds }) => {
      setSelectedOptionIds(new Set(optionIds));
    });
  }, [useDefaultOptions, categoryId]);

  useEffect(() => {
    if (!useDefaultOptions) setSelectedOptionIds(new Set());
  }, [useDefaultOptions]);

  const addNewOption = async () => {
    setOptionAddError('');
    const groupId = newOptionGroupId.trim();
    const optName = newOptionName.trim();
    if (!groupId) {
      setOptionAddError('옵션 그룹을 선택하세요.');
      return;
    }
    if (!optName) {
      setOptionAddError('옵션명을 입력하세요.');
      return;
    }
    setAddingOption(true);
    try {
      const option = await api.admin.optionGroups.createOption(groupId, {
        name: optName,
        defaultExtraPrice: Math.max(0, parseInt(newOptionPrice, 10) || 0),
      });
      setSelectedOptionIds((prev) => new Set([...prev, option.id]));
      setNewOptionName('');
      setNewOptionPrice('');
      loadOptionGroups();
    } catch (err) {
      setOptionAddError(err instanceof Error ? err.message : '옵션 추가에 실패했습니다.');
    } finally {
      setAddingOption(false);
    }
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const nameTrim = name.trim();
    const price = Number(basePrice);
    if (!nameTrim) {
      setError('상품명을 입력해 주세요.');
      return;
    }
    if (nameTrim.length > NAME_MAX) {
      setError(`상품명은 ${NAME_MAX}자 이내로 입력해 주세요.`);
      return;
    }
    if (!categoryId) {
      setError('카테고리를 선택해 주세요.');
      return;
    }
    if (!Number.isInteger(price) || price < 0) {
      setError('상품 가격을 0 이상의 숫자로 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const caloriesPayload = isDessertCategory ? nutritionToJson(nutrition) : undefined;
      const product = await api.admin.products.create({
        categoryId,
        name: nameTrim,
        englishName: englishName.trim() || undefined,
        description: description.trim() || undefined,
        basePrice: price,
        imageUrl: imageUrl.trim() || undefined,
        ingredients: ingredients.trim() || undefined,
        calories: caloriesPayload,
      });
      if (selectedOptionIds.size > 0) {
        await api.admin.products.setOptions(product.id, {
          optionIds: Array.from(selectedOptionIds),
        });
      }
      navigate('/admin/menu');
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-admin-textSecondary mb-0.5">메뉴관리</p>
          <h2 className="text-xl font-semibold text-admin-text">메뉴 등록하기</h2>
        </div>
        <Button theme="admin" variant="primary" disabled={submitting} type="submit" form="menu-register-form">
          {submitting ? '등록 중…' : '메뉴 등록하기'}
        </Button>
      </div>

      <form id="menu-register-form" onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {error && (
          <p className="text-sm text-admin-error" role="alert">
            {error}
          </p>
        )}

        <label className="block">
          <span className="block text-sm font-medium text-admin-text mb-1">카테고리 *</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-admin-border bg-white px-3 py-2.5 text-sm text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-primary"
          >
            <option value="">카테고리를 선택해 주세요.</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <label className="block text-sm font-medium text-admin-text mb-1">상품명 *</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              placeholder="상품명을 입력해주세요."
              maxLength={NAME_MAX}
              className="flex-1 rounded-lg border border-admin-border bg-white px-3 py-2.5 text-sm text-admin-text placeholder:text-admin-textSecondary focus:outline-none focus:ring-2 focus:ring-admin-primary"
            />
            <span className="text-sm text-admin-textSecondary shrink-0">
              {name.length} / {NAME_MAX}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-text mb-1">상품명(영문)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={englishName}
              onChange={(e) => setEnglishName(e.target.value.slice(0, NAME_MAX))}
              placeholder="상품명(영문)을 입력해주세요."
              maxLength={NAME_MAX}
              className="flex-1 rounded-lg border border-admin-border bg-white px-3 py-2.5 text-sm text-admin-text placeholder:text-admin-textSecondary focus:outline-none focus:ring-2 focus:ring-admin-primary"
            />
            <span className="text-sm text-admin-textSecondary shrink-0">
              {englishName.length} / {NAME_MAX}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-text mb-1">상품가격 *</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="상품 가격을 입력해주세요."
              className="flex-1 rounded-lg border border-admin-border bg-white px-3 py-2.5 text-sm text-admin-text placeholder:text-admin-textSecondary focus:outline-none focus:ring-2 focus:ring-admin-primary"
            />
            <span className="text-sm text-admin-textSecondary shrink-0">원</span>
          </div>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-admin-text mb-1">상품내용</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상품 상세설명을 입력해 주세요."
            rows={4}
            className="w-full rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text placeholder:text-admin-textSecondary resize-y focus:outline-none focus:ring-2 focus:ring-admin-primary"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-admin-text mb-1">원재료명 및 함량</span>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="원재료명 및 함량을 입력해 주세요."
            rows={3}
            className="w-full rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text placeholder:text-admin-textSecondary resize-y focus:outline-none focus:ring-2 focus:ring-admin-primary"
          />
        </label>

        <div>
          <span className="block text-sm font-medium text-admin-text mb-1">상품사진</span>
          <p className="text-xs text-admin-textSecondary mb-2">
            이미지 업로드 *규격 25mb 이하 png, jpg 권장 사이즈: 800×600px
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="이미지 URL을 입력하거나 파일 경로 (예: /images/파일명.png)"
              className="flex-1 rounded-lg border border-admin-border bg-white px-3 py-2.5 text-sm text-admin-text placeholder:text-admin-textSecondary focus:outline-none focus:ring-2 focus:ring-admin-primary"
            />
            <span className="text-admin-textSecondary" aria-hidden>
              <Plus className="h-5 w-5" />
            </span>
          </div>
        </div>

        {isDessertCategory && (
          <div className="border border-admin-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-admin-border">
              <span className="text-sm font-medium text-admin-text">열량 및 영양정보</span>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-admin-textSecondary mb-3">1회 제공량 기준으로 입력하세요.</p>
              <div className="overflow-x-auto">
                <table className="w-full border border-admin-border rounded-lg text-sm">
                  <thead className="bg-admin-surface">
                    <tr>
                      <th className="text-left p-2 font-medium text-admin-text">카테고리</th>
                      <th className="text-left p-2 font-medium text-admin-text">내용</th>
                    </tr>
                  </thead>
                  <tbody className="text-admin-text">
                    {NUTRITION_KEYS.map(({ key, label }) => (
                      <tr key={key} className="border-t border-admin-border">
                        <td className="p-2">{label}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={nutrition[key]}
                            onChange={(e) => setNutrition((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={key === 'kcal' ? '320' : key === 'sodium' ? '100mg' : '36g'}
                            className="w-full rounded border border-admin-border bg-white px-2 py-1.5 text-sm text-admin-text placeholder:text-admin-textSecondary focus:outline-none focus:ring-2 focus:ring-admin-primary"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="border border-admin-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOptionsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-admin-text hover:bg-admin-surface"
          >
            옵션
            {optionsOpen ? (
              <ChevronDown className="h-4 w-4 text-admin-textSecondary" />
            ) : (
              <ChevronRight className="h-4 w-4 text-admin-textSecondary" />
            )}
          </button>
          {optionsOpen && (
            <div className="px-4 pb-4 pt-3 border-t border-admin-border space-y-4">
              {/* 기본값 설정: 체크 시 기존 옵션 목록 불러오기 */}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-admin-text">
                <input
                  type="checkbox"
                  checked={useDefaultOptions}
                  onChange={(e) => setUseDefaultOptions(e.target.checked)}
                  className="rounded border-admin-border text-admin-primary"
                />
                <span>기본값 체크 (체크 시 이 카테고리에서 쓰는 기존 옵션을 체크합니다)</span>
              </label>

              {/* 옵션 추가 칸 - 고정 (항상 상단 배치) */}
              <div className="rounded-lg border border-admin-border bg-admin-surface/50 p-3 space-y-3 shrink-0">
                <p className="text-sm font-medium text-admin-text">옵션 추가</p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="min-w-[140px]">
                    <span className="block text-xs text-admin-textSecondary mb-1">카테고리</span>
                    <select
                      value={newOptionGroupId}
                      onChange={(e) => setNewOptionGroupId(e.target.value)}
                      className="w-full rounded border border-admin-border bg-white px-2 py-2 text-sm text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-primary"
                    >
                      <option value="">카테고리를 선택해 주세요</option>
                      {optionGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-1 min-w-[120px]">
                    <span className="block text-xs text-admin-textSecondary mb-1">옵션명</span>
                    <input
                      type="text"
                      value={newOptionName}
                      onChange={(e) => setNewOptionName(e.target.value)}
                      placeholder="옵션명을 입력해 주세요."
                      className="w-full rounded border border-admin-border bg-white px-2 py-2 text-sm text-admin-text placeholder:text-admin-textSecondary focus:outline-none focus:ring-2 focus:ring-admin-primary"
                    />
                  </label>
                  <label className="w-28">
                    <span className="block text-xs text-admin-textSecondary mb-1">추가 금액(원)</span>
                    <input
                      type="number"
                      min={0}
                      value={newOptionPrice}
                      onChange={(e) => setNewOptionPrice(e.target.value)}
                      placeholder="0"
                      className="w-full rounded border border-admin-border bg-white px-2 py-2 text-sm text-admin-text placeholder:text-admin-textSecondary focus:outline-none focus:ring-2 focus:ring-admin-primary"
                    />
                  </label>
                  <Button
                    theme="admin"
                    variant="secondary"
                    type="button"
                    onClick={addNewOption}
                    disabled={addingOption}
                  >
                    {addingOption ? '추가 중…' : '입력'}
                  </Button>
                </div>
                {optionAddError && (
                  <p className="text-xs text-admin-error" role="alert">
                    {optionAddError}
                  </p>
                )}
              </div>

              {/* 옵션 목록 - 체크리스트 형태 */}
              <div>
                <p className="text-sm font-medium text-admin-text mb-2">옵션 목록 (적용할 옵션을 체크하세요)</p>
                {optionGroups.length === 0 ? (
                  <p className="text-sm text-admin-textSecondary py-2">등록된 옵션이 없습니다. 위에서 옵션을 추가하거나 기본값 설정을 켜 주세요.</p>
                ) : (
                  <ul className="border border-admin-border rounded-lg divide-y divide-admin-border overflow-hidden bg-white">
                    {optionGroups.flatMap((group) =>
                      group.options.map((opt) => (
                        <li key={opt.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-admin-surface/50">
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedOptionIds.has(opt.id)}
                              onChange={() => toggleOption(opt.id)}
                              className="rounded border-admin-border text-admin-primary shrink-0"
                            />
                            <span className="text-sm text-admin-text truncate">
                              [{group.name}] {opt.name}
                              {opt.defaultExtraPrice > 0 && (
                                <span className="text-admin-textSecondary ml-1">
                                  +{opt.defaultExtraPrice.toLocaleString()}원
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
