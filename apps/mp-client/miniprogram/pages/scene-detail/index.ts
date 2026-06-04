import { api } from '../../services/api';
import { appStore } from '../../store/app-store';
import { AssistantPublicProfile, ServicePackage, ServiceScene } from '../../services/types';

Page({
  data: {
    sceneId: '',
    scene: undefined as ServiceScene | undefined,
    packages: [] as ServicePackage[],
    assistants: [] as AssistantPublicProfile[],
    loading: false,
    error: '',
    processItems: [
      { title: '明确场景', desc: '确认目标、服务边界与适合的现场协同方式。' },
      { title: '选择助理', desc: '按城市、气质风格、擅长场景和公开资料筛选。' },
      { title: '提交需求', desc: '确认日期、人数、预算和禁忌事项后进入平台匹配。' }
    ]
  },

  async onLoad(query: { id?: string; code?: string }) {
    this.setData({ sceneId: query.id || '' });
    await this.loadScene(query);
  },

  async loadScene(query: { id?: string; code?: string }) {
    this.setData({ loading: true, error: '' });
    try {
      const scenes = await api.getScenes();
      const scene = scenes.find(item => item.id === query.id || item.code === query.code) || scenes[0];
      if (!scene) {
        this.setData({ error: '未找到该服务场景' });
        return;
      }
      const [packages, assistants] = await Promise.all([
        api.getPackages(scene.id),
        api.getAssistants({ scene: scene.name })
      ]);
      this.setData({
        sceneId: scene.id,
        scene,
        packages,
        assistants: assistants.slice(0, 3)
      });
      wx.setNavigationBarTitle({ title: scene.name });
    } catch (error) {
      this.setData({ error: (error as Error).message || '场景内容加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  chooseAssistants() {
    const scene = this.data.scene;
    if (!scene) return;
    wx.navigateTo({
      url: `/pages/assistants/index?scene=${encodeURIComponent(scene.name)}&sceneId=${encodeURIComponent(scene.id)}`
    });
  },

  openAssistant(event: WechatMiniprogram.BaseEvent) {
    const scene = this.data.scene;
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/assistant-detail/index?id=${id}${scene ? `&scene=${encodeURIComponent(scene.name)}&sceneId=${encodeURIComponent(scene.id)}` : ''}`
    });
  },

  openPackages() {
    const scene = this.data.scene;
    if (!scene) return;
    wx.navigateTo({ url: `/pages/packages/index?sceneId=${scene.id}&scene=${encodeURIComponent(scene.name)}` });
  },

  createBooking() {
    const scene = this.data.scene;
    if (!scene) return;
    const firstPackage = this.data.packages[0];
    if (firstPackage) appStore.setSelectedPackage(firstPackage);
    appStore.setPendingBooking({
      city: '',
      date: '',
      time: '',
      dinnerType: scene.name,
      guestCount: 4,
      assistantCount: firstPackage?.assistantCount || 1,
      budget: firstPackage?.serviceFee || 1500,
      preference: '',
      taboos: '',
      remark: '',
      sceneId: scene.id,
      packageId: firstPackage?.id
    });
    wx.navigateTo({ url: `/pages/booking-form/index?sceneId=${scene.id}${firstPackage ? `&packageId=${firstPackage.id}` : ''}` });
  },

  retry() {
    this.loadScene({ id: this.data.sceneId });
  }
});
