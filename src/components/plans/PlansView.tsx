import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Copy,
  Trash2,
  CheckCircle,
  Archive,
  Power,
  Search,
  Check,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Plan } from '../../types';

interface PlansViewProps {
  plans: Plan[];
  onAddPlan: (plan: Plan) => void;
  onUpdatePlan: (id: string, updates: Partial<Plan>) => void;
  onDeletePlan: (id: string) => void;
  onDuplicatePlan: (id: string) => void;
  isRtl: boolean;
}

export const PlansView: React.FC<PlansViewProps> = ({
  plans,
  onAddPlan,
  onUpdatePlan,
  onDeletePlan,
  onDuplicatePlan,
  isRtl,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED'>('ALL');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formInternalName, setFormInternalName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formCurrency, setFormCurrency] = useState<'TOMAN' | 'IRT' | 'USD'>('TOMAN');
  const [formDurationDays, setFormDurationDays] = useState(30);
  const [formTrafficGb, setFormTrafficGb] = useState(10);
  const [formTrafficPolicy, setFormTrafficPolicy] = useState<'UNLIMITED' | 'CAPPED' | 'THROTTLED'>('CAPPED');
  const [formFeaturesText, setFormFeaturesText] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'DISABLED' | 'ARCHIVED'>('ACTIVE');

  const uniquePlans = Array.from(new Map(plans.map((p) => [p.id, p])).values());

  const filteredPlans = uniquePlans.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.internalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormName('');
    setFormInternalName('');
    setFormDescription('');
    setFormPrice(500000);
    setFormCurrency('TOMAN');
    setFormDurationDays(30);
    setFormTrafficGb(10);
    setFormTrafficPolicy('CAPPED');
    setFormFeaturesText('اتصال حساب‌های تلگرام\nپشتیبانی از گروه‌ها و کانال‌ها\nزمان‌بندی هوشمند ارسال');
    setFormStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormInternalName(plan.internalName);
    setFormDescription(plan.description);
    setFormPrice(plan.price);
    setFormCurrency(plan.currency === 'USD' ? 'USD' : 'TOMAN');
    setFormDurationDays(plan.durationDays);
    setFormTrafficGb(plan.trafficGb);
    setFormTrafficPolicy(plan.trafficPolicy);
    setFormFeaturesText((plan.features || []).join('\n'));
    setFormStatus(plan.status);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const featuresArray = formFeaturesText
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (editingPlan) {
      onUpdatePlan(editingPlan.id, {
        name: formName.trim(),
        internalName: formInternalName.trim() || formName.trim().toLowerCase().replace(/\s+/g, '_'),
        description: formDescription.trim(),
        price: Number(formPrice),
        currency: formCurrency,
        durationDays: Number(formDurationDays),
        trafficGb: Number(formTrafficGb),
        trafficPolicy: formTrafficPolicy,
        features: featuresArray,
        status: formStatus,
      });
    } else {
      const newPlan: Plan = {
        id: 'plan-' + Date.now(),
        name: formName.trim(),
        internalName: formInternalName.trim() || formName.trim().toLowerCase().replace(/\s+/g, '_'),
        description: formDescription.trim(),
        price: Number(formPrice),
        currency: formCurrency,
        durationDays: Number(formDurationDays),
        trafficGb: Number(formTrafficGb),
        trafficPolicy: formTrafficPolicy,
        features: featuresArray,
        status: formStatus,
        displayOrder: uniquePlans.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onAddPlan(newPlan);
    }

    setIsModalOpen(false);
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'TOMAN') {
      return price.toLocaleString('fa-IR') + ' تومان';
    }
    if (currency === 'USD') {
      return '$' + price.toLocaleString('en-US');
    }
    return price.toLocaleString('fa-IR') + ' ریال';
  };

  return (
    <div id="plans-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-400" />
            <span>{isRtl ? 'مدیریت پلن‌ها و اشتراک‌ها' : 'Subscription Plans Management'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'تعریف، ویرایش و مدیریت تعرفه‌های انتشار، ظرفیت ترافیک و مدت زمان اعتبار حساب‌ها'
              : 'Configure subscription packages, publishing capacities, traffic policies, and billing durations.'}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{isRtl ? 'افزودن پلن جدید' : 'Create New Plan'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'جستجو در نام، شناسه یا توضیحات پلن...' : 'Search plans by name, code or details...'}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          {(['ALL', 'ACTIVE', 'DISABLED', 'ARCHIVED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-3 py-1.5 transition-all text-xs cursor-pointer ${
                filterStatus === status
                  ? 'bg-indigo-600 text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {status === 'ALL'
                ? isRtl
                  ? 'همه'
                  : 'All'
                : status === 'ACTIVE'
                ? isRtl
                  ? 'فعال'
                  : 'Active'
                : status === 'DISABLED'
                ? isRtl
                  ? 'غیرفعال'
                  : 'Disabled'
                : isRtl
                ? 'بایگانی‌شده'
                : 'Archived'}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid or Empty State */}
      {filteredPlans.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <Layers className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200 mb-1">
            {isRtl ? 'هیچ پلنی یافت نشد' : 'No Plans Configured'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
            {isRtl
              ? 'هنوز هیچ پلنی ثبت نشده است یا با فیلتر جستجوی فعلی تطابق ندارد. می‌توانید اولین پلن را ایجاد کنید.'
              : 'No plans match the current filters. Create a new plan to define packages.'}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{isRtl ? 'ایجاد اولین پلن' : 'Add First Plan'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => {
            const isActive = plan.status === 'ACTIVE';
            const isArchived = plan.status === 'ARCHIVED';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl border bg-slate-900/90 p-5 transition-all ${
                  isActive
                    ? 'border-slate-800 hover:border-slate-700 shadow-sm'
                    : 'border-slate-800/60 opacity-75'
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-slate-400">{plan.internalName}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        plan.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : plan.status === 'DISABLED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      {plan.status === 'ACTIVE'
                        ? isRtl
                          ? 'فعال'
                          : 'ACTIVE'
                        : plan.status === 'DISABLED'
                        ? isRtl
                          ? 'غیرفعال'
                          : 'DISABLED'
                        : isRtl
                        ? 'بایگانی'
                        : 'ARCHIVED'}
                    </span>
                  </div>

                  {/* Title & Price */}
                  <h3 className="text-base font-bold text-slate-100 mb-1">{plan.name}</h3>
                  <div className="text-lg font-bold text-indigo-400 mb-3 font-mono">
                    {formatPrice(plan.price, plan.currency)}
                    <span className="text-xs text-slate-500 font-normal mr-1.5">
                      / {plan.durationDays} {isRtl ? 'روزه' : 'days'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                    {plan.description || (isRtl ? 'بدون توضیحات تکمیلی' : 'No description provided')}
                  </p>

                  {/* Feature Highlights */}
                  <div className="border-t border-slate-800/80 pt-3 mb-4 space-y-1.5">
                    <div className="text-[11px] text-slate-400 flex items-center justify-between mb-2">
                      <span>{isRtl ? 'سقف ترافیک ماهانه:' : 'Traffic Limit:'}</span>
                      <span className="font-mono text-slate-200">
                        {plan.trafficPolicy === 'UNLIMITED'
                          ? isRtl
                            ? 'نامحدود'
                            : 'Unlimited'
                          : `${plan.trafficGb} GB`}
                      </span>
                    </div>

                    {(plan.features || []).slice(0, 4).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                      title={isRtl ? 'ویرایش پلن' : 'Edit Plan'}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDuplicatePlan(plan.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                      title={isRtl ? 'ایجاد نسخه کپی' : 'Duplicate Plan'}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        onUpdatePlan(plan.id, {
                          status: plan.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                        })
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                      title={plan.status === 'ACTIVE' ? (isRtl ? 'غیرفعال‌سازی' : 'Disable') : (isRtl ? 'فعال‌سازی' : 'Enable')}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => onDeletePlan(plan.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title={isRtl ? 'حذف پلن' : 'Delete Plan'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Plan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                <span>
                  {editingPlan
                    ? isRtl
                      ? 'ویرایش پلن اشتراک'
                      : 'Edit Subscription Plan'
                    : isRtl
                    ? 'ایجاد پلن اشتراک جدید'
                    : 'Create New Subscription Plan'}
                </span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {isRtl ? 'نام نمایشی پلن *' : 'Plan Display Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={isRtl ? 'مثال: پلن حرفه‌ای ۳۰ روزه' : 'e.g. Pro Monthly'}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {isRtl ? 'شناسه داخلی (انگلیسی)' : 'Internal Slug / Identifier'}
                  </label>
                  <input
                    type="text"
                    value={formInternalName}
                    onChange={(e) => setFormInternalName(e.target.value)}
                    placeholder="pro_monthly"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 font-mono text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {isRtl ? 'توضیحات بسته' : 'Plan Description'}
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={isRtl ? 'شرح مختصری از امکانات و کاربرد این پلن...' : 'Brief summary of package offerings...'}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{isRtl ? 'قیمت' : 'Price'}</label>
                  <input
                    type="number"
                    min={0}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 font-mono text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{isRtl ? 'واحد پول' : 'Currency'}</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="TOMAN">{isRtl ? 'تومان' : 'Toman'}</option>
                    <option value="IRT">{isRtl ? 'ریال' : 'Rial'}</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {isRtl ? 'مدت اعتبار (روز)' : 'Duration (Days)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formDurationDays}
                    onChange={(e) => setFormDurationDays(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 font-mono text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {isRtl ? 'سیاست ترافیک' : 'Traffic Policy'}
                  </label>
                  <select
                    value={formTrafficPolicy}
                    onChange={(e) => setFormTrafficPolicy(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="UNLIMITED">{isRtl ? 'نامحدود (Unlimited)' : 'Unlimited'}</option>
                    <option value="CAPPED">{isRtl ? 'محدود به سقف حجم (Capped)' : 'Capped'}</option>
                    <option value="THROTTLED">{isRtl ? 'کاهش سرعت پس از سقف' : 'Throttled'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    {isRtl ? 'حجم ترافیک (GB)' : 'Traffic Limit (GB)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={formTrafficPolicy === 'UNLIMITED'}
                    value={formTrafficGb}
                    onChange={(e) => setFormTrafficGb(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 font-mono text-slate-200 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {isRtl ? 'ویژگی‌ها (هر خط یک مورد)' : 'Features List (One per line)'}
                </label>
                <textarea
                  rows={3}
                  value={formFeaturesText}
                  onChange={(e) => setFormFeaturesText(e.target.value)}
                  placeholder={isRtl ? 'اتصال ۱۰ اکانت همزمان\nپشتیبانی ۲۴ ساعته' : 'Feature 1\nFeature 2'}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{isRtl ? 'وضعیت پلن' : 'Status'}</label>
                <div className="flex items-center gap-3">
                  {(['ACTIVE', 'DISABLED', 'ARCHIVED'] as const).map((st) => (
                    <label key={st} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="planStatus"
                        checked={formStatus === st}
                        onChange={() => setFormStatus(st)}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <span>
                        {st === 'ACTIVE'
                          ? isRtl
                            ? 'فعال'
                            : 'Active'
                          : st === 'DISABLED'
                          ? isRtl
                            ? 'غیرفعال'
                            : 'Disabled'
                          : isRtl
                          ? 'بایگانی'
                          : 'Archived'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  {isRtl ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 font-semibold text-white cursor-pointer"
                >
                  {editingPlan ? (isRtl ? 'ذخیره تغییرات' : 'Save Changes') : (isRtl ? 'ایجاد پلن' : 'Create Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
