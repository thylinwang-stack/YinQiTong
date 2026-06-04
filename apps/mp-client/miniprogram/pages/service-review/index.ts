import { api, ensureCustomerLogin } from '../../services/api';
import { AssistantServiceReviewInput, ServiceReview, ServiceReviewSubmitInput } from '../../services/types';
import { validateServiceReviewInput } from '../../utils/validators';

const ratingNumbers = [1, 2, 3, 4, 5];

const defaultHighlightOptions = [
  '分寸得体',
  '自然破冰',
  '不抢主角',
  '控场稳定',
  '准时可靠',
  '沟通清晰',
  '形象合规',
  '简报执行到位'
].map(label => ({ label, selected: false }));

const emptyForm: ServiceReviewSubmitInput = {
  overallRating: 0,
  atmosphereRating: 0,
  professionalismRating: 0,
  boundarySenseRating: 0,
  punctualityRating: 0,
  assistantReviews: [],
  highlightTags: [],
  comment: '',
  allowFollowUp: true,
  repurchaseIntent: 'yes'
};

Page({
  data: {
    orderId: '',
    token: '',
    loading: true,
    submitting: false,
    error: '',
    review: undefined as ServiceReview | undefined,
    form: emptyForm,
    ratingNumbers,
    highlightOptions: defaultHighlightOptions,
    isSubmitted: false,
    isReviewable: false,
    sharePath: ''
  },

  async onLoad(query: { orderId?: string; id?: string; token?: string }) {
    const orderId = query.orderId || query.id || '';
    const token = query.token || '';
    this.setData({ orderId, token });
    if (!orderId) {
      this.setData({ loading: false, error: '评价链接缺少订单信息' });
      return;
    }
    await this.loadReview(orderId, token);
  },

  onShareAppMessage() {
    const review = this.data.review;
    return {
      title: review?.shareTitle || '请评价本次服务体验',
      path: this.data.sharePath || `/pages/service-review/index?orderId=${this.data.orderId}&token=${this.data.token}`
    };
  },

  onShareTimeline() {
    return {
      title: this.data.review?.shareTitle || '请评价本次服务体验',
      query: `orderId=${this.data.orderId}&token=${this.data.token}`
    };
  },

  async loadReview(orderId: string, token?: string) {
    this.setData({ loading: true, error: '' });
    try {
      const review = await api.getServiceReview(orderId, token);
      this.applyReview(review);
    } catch (error) {
      this.setData({ error: (error as Error).message || '评价页面加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  applyReview(review: ServiceReview) {
    const assistantReviews = review.assistants.map(assistant => {
      const existing = review.assistantReviews.find(item => item.assistantId === assistant.assistantId);
      return existing || {
        assistantId: assistant.assistantId,
        assistantNo: assistant.assistantNo,
        rating: 0,
        comment: ''
      };
    });
    const highlightOptions = defaultHighlightOptions.map(item => ({
      ...item,
      selected: review.highlightTags.includes(item.label)
    }));
    this.setData({
      review,
      isSubmitted: review.status === 'submitted',
      isReviewable: review.status === 'pending',
      sharePath: review.sharePath,
      form: {
        overallRating: review.overallRating || 0,
        atmosphereRating: review.atmosphereRating || 0,
        professionalismRating: review.professionalismRating || 0,
        boundarySenseRating: review.boundarySenseRating || 0,
        punctualityRating: review.punctualityRating || 0,
        assistantReviews,
        highlightTags: review.highlightTags || [],
        comment: review.comment || '',
        allowFollowUp: review.allowFollowUp !== false,
        repurchaseIntent: review.repurchaseIntent || 'yes'
      },
      highlightOptions
    });
  },

  onRate(event: WechatMiniprogram.BaseEvent) {
    const field = event.currentTarget.dataset.field as keyof ServiceReviewSubmitInput;
    const score = Number(event.currentTarget.dataset.score);
    if (!field || !score) return;
    this.setData({ [`form.${field}`]: score });
  },

  onAssistantRate(event: WechatMiniprogram.BaseEvent) {
    const index = Number(event.currentTarget.dataset.index);
    const score = Number(event.currentTarget.dataset.score);
    const assistantReviews = [...this.data.form.assistantReviews];
    if (!assistantReviews[index] || !score) return;
    assistantReviews[index] = { ...assistantReviews[index], rating: score };
    this.setData({ 'form.assistantReviews': assistantReviews });
  },

  onAssistantCommentInput(event: WechatMiniprogram.Input) {
    const index = Number(event.currentTarget.dataset.index);
    const assistantReviews = [...this.data.form.assistantReviews];
    if (!assistantReviews[index]) return;
    assistantReviews[index] = {
      ...assistantReviews[index],
      comment: String(event.detail.value || '')
    };
    this.setData({ 'form.assistantReviews': assistantReviews });
  },

  toggleHighlight(event: WechatMiniprogram.BaseEvent) {
    const index = Number(event.currentTarget.dataset.index);
    const highlightOptions = this.data.highlightOptions.map((item, itemIndex) =>
      itemIndex === index ? { ...item, selected: !item.selected } : item
    );
    this.setData({
      highlightOptions,
      'form.highlightTags': highlightOptions.filter(item => item.selected).map(item => item.label)
    });
  },

  onCommentInput(event: WechatMiniprogram.Input) {
    this.setData({ 'form.comment': String(event.detail.value || '') });
  },

  onFollowUpChange(event: WechatMiniprogram.SwitchChange) {
    this.setData({ 'form.allowFollowUp': Boolean(event.detail.value) });
  },

  onRepurchaseChange(event: WechatMiniprogram.BaseEvent) {
    const value = event.currentTarget.dataset.value as ServiceReviewSubmitInput['repurchaseIntent'];
    this.setData({ 'form.repurchaseIntent': value });
  },

  async submitReview() {
    if (!this.data.review || this.data.submitting) return;
    const result = validateServiceReviewInput(this.data.form);
    if (!result.valid) {
      wx.showToast({ title: result.message || '请完善评价', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await ensureCustomerLogin();
      const review = await api.submitServiceReview(this.data.review.orderId, this.data.form, this.data.token);
      this.applyReview(review);
      wx.showModal({
        title: '评价已提交',
        content: '感谢你的反馈，平台会用于服务复盘、团队培训与风控质检。',
        showCancel: false
      });
    } catch (error) {
      wx.showToast({ title: (error as Error).message || '评价提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goOrderDetail() {
    const review = this.data.review;
    if (!review) return;
    wx.navigateTo({ url: `/pages/order-detail/index?id=${review.orderId}` });
  }
});
