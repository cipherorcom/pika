import { useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, Radio, Slider, Space, Spin, Upload } from 'antd';
import { Upload as UploadIcon, Grid3x3, List } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SystemConfig } from '@/api/property.ts';
import { getSystemConfig, saveSystemConfig } from '@/api/property.ts';
import { getErrorMessage } from '@/lib/utils.ts';
import type { RcFile } from 'antd/es/upload/interface';

const SystemConfigComponent = () => {
    const [form] = Form.useForm();
    const { message: messageApi } = App.useApp();
    const queryClient = useQueryClient();
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [backgroundPreview, setBackgroundPreview] = useState<string>('');
    const [uploading, setUploading] = useState(false);

    // 获取系统配置
    const { data: config, isLoading } = useQuery({
        queryKey: ['systemConfig'],
        queryFn: getSystemConfig,
    });

    // 保存系统配置 mutation
    const saveMutation = useMutation({
        mutationFn: saveSystemConfig,
        onSuccess: () => {
            messageApi.success('保存成功');
            queryClient.invalidateQueries({ queryKey: ['systemConfig'] });
            // 刷新页面以应用新的系统配置
            window.location.reload();
        },
        onError: (error: unknown) => {
            messageApi.error(getErrorMessage(error, '保存失败'));
        },
    });

    // 初始化系统配置表单
    useEffect(() => {
        if (config) {
            form.setFieldsValue({
                systemNameEn: config.systemNameEn,
                systemNameZh: config.systemNameZh,
                icpCode: config.icpCode,
                defaultView: config.defaultView ?? true, // 默认为 grid 视图
                backgroundOverlayOpacity: config.backgroundOverlayOpacity ?? 65,
                chromeBlur: config.chromeBlur ?? 24,
                customCSS: config.customCSS,
                customJS: config.customJS,
            });
            if (config.logoBase64) {
                setLogoPreview(config.logoBase64);
            }
            setBackgroundPreview(config.backgroundBase64 || '');
        }
    }, [config, form]);

    // 将文件转换为 base64
    const fileToBase64 = (file: RcFile): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    // 处理图片上传前的验证
    const beforeUpload = (file: RcFile) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            messageApi.error('只能上传图片文件！');
            return false;
        }

        // 限制大小为 500KB
        const isLt500K = file.size / 1024 < 500;
        if (!isLt500K) {
            messageApi.error('图片大小不能超过 500KB！');
            return false;
        }

        // 转换为 base64
        setUploading(true);
        fileToBase64(file)
            .then((base64) => {
                setLogoPreview(base64);
                setUploading(false);
            })
            .catch((error) => {
                console.error('转换图片失败:', error);
                messageApi.error('转换图片失败');
                setUploading(false);
            });

        return false; // 阻止自动上传
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            saveMutation.mutate({
                systemNameEn: values.systemNameEn,
                systemNameZh: values.systemNameZh,
                logoBase64: logoPreview,
                backgroundBase64: backgroundPreview,
                backgroundOverlayOpacity: values.backgroundOverlayOpacity ?? 65,
                chromeBlur: values.chromeBlur ?? 24,
                navigationEnabled: config?.navigationEnabled ?? false,
                navigationSheetUrl: config?.navigationSheetUrl ?? '',
                icpCode: values.icpCode || '',
                defaultView: values.defaultView ?? true,
                customCSS: values.customCSS || '',
                customJS: values.customJS || '',
            } as SystemConfig);
        } catch (error) {
            // 表单验证失败
        }
    };

    const handleReset = () => {
        // 重置为当前配置的值
        if (config) {
            form.setFieldsValue({
                systemNameEn: config.systemNameEn,
                systemNameZh: config.systemNameZh,
                icpCode: config.icpCode,
                defaultView: config.defaultView ?? true,
                backgroundOverlayOpacity: config.backgroundOverlayOpacity ?? 65,
                chromeBlur: config.chromeBlur ?? 24,
                customCSS: config.customCSS,
                customJS: config.customJS,
            });
            setLogoPreview(config.logoBase64 || '');
            setBackgroundPreview(config.backgroundBase64 || '');
        }
    };

    // 获取 Logo 显示 URL
    const getLogoUrl = () => {
        if (logoPreview) {
            return logoPreview;
        }
        return '/logo.png';
    };

    const beforeBackgroundUpload = (file: RcFile) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            messageApi.error('只能上传图片文件！');
            return false;
        }
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            messageApi.error('背景图片不能超过 10MB！');
            return false;
        }
        setUploading(true);
        fileToBase64(file)
            .then((base64) => setBackgroundPreview(base64))
            .catch(() => messageApi.error('转换背景图片失败'))
            .finally(() => setUploading(false));
        return false;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Spin />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4">
                <h2 className="text-xl font-bold">系统配置</h2>
                <p className="text-gray-500 mt-2">配置系统名称和 Logo，这些设置将在公共页面和管理后台显示</p>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSave}>
                <Space direction={'vertical'} className={'w-full'}>
                    <Card
                        title="系统基本信息"
                        type="inner"
                        className="mb-4"
                    >
                        <div className={'flex items-center gap-2'}>
                            <Form.Item
                                label="系统英文名称"
                                name="systemNameEn"
                                dependencies={['systemNameZh']}
                                rules={[
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value && !getFieldValue('systemNameZh')) {
                                                return Promise.reject(new Error('系统英文名称和中文名称不能同时为空'));
                                            }
                                            return Promise.resolve();
                                        },
                                    }),
                                    { max: 50, message: '系统名称不能超过 50 个字符' },
                                ]}
                            >
                                <Input placeholder="例如：Pika Monitor" />
                            </Form.Item>

                            <Form.Item
                                label="系统中文名称"
                                name="systemNameZh"
                                dependencies={['systemNameEn']}
                                rules={[
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value && !getFieldValue('systemNameEn')) {
                                                return Promise.reject(new Error('系统英文名称和中文名称不能同时为空'));
                                            }
                                            return Promise.resolve();
                                        },
                                    }),
                                    { max: 50, message: '系统名称不能超过 50 个字符' },
                                ]}
                            >
                                <Input placeholder="例如：皮卡监控" />
                            </Form.Item>
                        </div>

                        <Form.Item
                            label="ICP 备案号"
                            name="icpCode"
                            rules={[
                                { max: 50, message: 'ICP 备案号不能超过 50 个字符' },
                            ]}
                            tooltip="ICP 备案号将显示在公共页面底部，例如：京ICP备12345678号"
                        >
                            <Input placeholder="例如：京ICP备12345678号" />
                        </Form.Item>

                        <Form.Item
                            label="默认视图模式"
                            name="defaultView"
                            tooltip="选择公共页面默认显示的视图模式"
                        >
                            <Radio.Group>
                                <Radio.Button value="grid">
                                    <Space size={4}>
                                        <Grid3x3 size={16} />
                                        <span>网格视图</span>
                                    </Space>
                                </Radio.Button>
                                <Radio.Button value="list">
                                    <Space size={4}>
                                        <List size={16} />
                                        <span>列表视图</span>
                                    </Space>
                                </Radio.Button>
                            </Radio.Group>
                        </Form.Item>

                        <Form.Item
                            label="系统 Logo"
                            tooltip="上传系统 Logo，建议使用正方形图片，尺寸为 256x256 或更大，文件大小不超过 500KB"
                        >
                            <Space direction="vertical" className="w-full">
                                <Upload
                                    accept="image/*"
                                    showUploadList={false}
                                    beforeUpload={beforeUpload}
                                    disabled={uploading}
                                >
                                    <Button icon={<UploadIcon size={16} />} loading={uploading}>
                                        {uploading ? '处理中...' : '上传 Logo'}
                                    </Button>
                                </Upload>
                            </Space>
                        </Form.Item>

                        <Form.Item
                            label="公共页面背景图"
                            tooltip="上传后将应用到公开监控页面。建议使用横向图片，文件大小不超过 10MB。"
                        >
                            <Space direction="vertical" className="w-full">
                                {backgroundPreview && (
                                    <div className="h-24 w-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm">
                                        <img src={backgroundPreview} alt="公共页面背景缩略图" className="h-full w-full object-cover"/>
                                    </div>
                                )}
                                <Space wrap>
                                    <Upload accept="image/*" showUploadList={false} beforeUpload={beforeBackgroundUpload} disabled={uploading}>
                                        <Button icon={<UploadIcon size={16} />} loading={uploading}>
                                            {uploading ? '处理中...' : backgroundPreview ? '更换背景图' : '上传背景图'}
                                        </Button>
                                    </Upload>
                                    {backgroundPreview && <Button danger onClick={() => setBackgroundPreview('')}>移除背景</Button>}
                                </Space>
                                <span className="text-xs text-slate-500">公开页面会以铺满方式显示图片。</span>
                            </Space>
                        </Form.Item>

                        <Form.Item
                            label="背景遮罩透明度"
                            name="backgroundOverlayOpacity"
                            tooltip="数值越低，背景图片、顶部导航和底部页脚越明亮；数值越高，文字和数据越清晰。"
                            extra="该设置会同时应用于页面背景、顶部导航和底部页脚；0% 为完全透明。"
                        >
                            <Slider min={0} max={100} step={5} marks={{ 0: '透明', 65: '推荐', 100: '不透明' }} tooltip={{ formatter: (value) => `${value ?? 65}%` }} />
                        </Form.Item>

                        <Form.Item
                            label="导航与页脚模糊度"
                            name="chromeBlur"
                            tooltip="控制顶部导航和底部页脚的毛玻璃模糊效果。"
                            extra="0px 为不模糊，24px 为较强毛玻璃效果。"
                        >
                            <Slider min={0} max={24} step={1} marks={{ 0: '无', 12: '适中', 24: '强' }} tooltip={{ formatter: (value) => `${value ?? 24}px` }} />
                        </Form.Item>
                    </Card>

                    <Card
                        title="自定义代码"
                        type="inner"
                        className="mb-4"
                    >
                        <Form.Item
                            label="自定义 CSS"
                            name="customCSS"
                            tooltip="输入自定义 CSS 代码，将注入到页面 <style> 标签中"
                        >
                            <Input.TextArea
                                placeholder="例如：body { background-color: #f0f0f0; }"
                                rows={6}
                            />
                        </Form.Item>

                        <Form.Item
                            label="自定义 JS"
                            name="customJS"
                            tooltip="输入自定义 JavaScript 代码，将注入到页面 <script> 标签中"
                        >
                            <Input.TextArea
                                placeholder="例如：console.log('Hello World');"
                                rows={6}
                            />
                        </Form.Item>
                    </Card>

                    <Card
                        title="预览效果"
                        type="inner"
                        className="mb-4"
                    >
                        <Form.Item noStyle shouldUpdate>
                            {({ getFieldValue }) => {
                                const systemNameEn = getFieldValue('systemNameEn') || '';
                                const systemNameZh = getFieldValue('systemNameZh') || '';

                                // 与 PublicHeader 相同的分割逻辑
                                let leftName = '';
                                let rightName = '';

                                if (systemNameEn) {
                                    // 优先在空格处分割
                                    const spaceIndex = systemNameEn.indexOf(' ');
                                    if (spaceIndex > 0) {
                                        leftName = systemNameEn.substring(0, spaceIndex);
                                        rightName = systemNameEn.substring(spaceIndex); // 保留空格
                                    } else {
                                        // 如果没有空格，从中间分割
                                        const mid = Math.floor(systemNameEn.length / 2);
                                        leftName = systemNameEn.substring(0, mid);
                                        rightName = systemNameEn.substring(mid);
                                    }
                                }

                                const overlayOpacity = Math.min(100, Math.max(0, getFieldValue('backgroundOverlayOpacity') ?? 65));
                                const chromeBlur = Math.min(24, Math.max(0, getFieldValue('chromeBlur') ?? 24));
                                const chromeStyle = {
                                    backgroundColor: `rgb(2 9 23 / ${overlayOpacity / 100})`,
                                    backdropFilter: `blur(${chromeBlur}px)`,
                                };

                                return (
                                    <div className="relative min-h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm dark:border-cyan-900/70">
                                        <div
                                            className="absolute inset-0 bg-cover bg-center"
                                            style={backgroundPreview ? { backgroundImage: `url(${backgroundPreview})` } : { backgroundImage: 'radial-gradient(circle at 20% 0%, #164e63 0%, #0f172a 48%, #020617 100%)' }}
                                        />
                                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,9,23,.82),rgba(2,8,19,1))]" style={{ opacity: overlayOpacity / 100 }} />

                                        <div className="relative flex min-h-[280px] flex-col">
                                            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3" style={chromeStyle}>
                                                <div className="flex items-center gap-2.5">
                                                    <img src={getLogoUrl()} alt="Logo 预览" className="h-8 w-8 rounded-md object-contain" onError={(e) => { e.currentTarget.src = '/logo.png'; }} />
                                                    <div>
                                                        <h1 className="text-base font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-teal-200 uppercase italic">{leftName}<span className="text-white">{rightName}</span></h1>
                                                        <p className="text-[9px] font-mono tracking-[0.25em] text-cyan-200/80 uppercase">{systemNameZh}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] font-medium text-cyan-100/90"><span className="rounded bg-cyan-400/15 px-2 py-1">设备监控</span><span className="text-white/60">服务监控</span></div>
                                            </div>

                                            <div className="flex-1 p-4">
                                                <p className="text-xs font-semibold text-white">概览</p>
                                                <p className="mt-1 text-[10px] text-cyan-100/75">公开页面背景与组件效果预览</p>
                                                <div className="mt-3 grid grid-cols-3 gap-2">
                                                    {['在线服务器', 'CPU 使用率', '实时网络'].map((item, index) => <div key={item} className="rounded-lg border border-white/15 bg-slate-950/55 p-2 backdrop-blur-sm"><p className="text-[9px] text-cyan-100/65">{item}</p><p className="mt-1 text-sm font-semibold text-white">{index === 0 ? '12' : index === 1 ? '28%' : '1.2 MB/s'}</p></div>)}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[9px] text-cyan-100/70" style={chromeStyle}><span>© {new Date().getFullYear()} {systemNameEn || 'Pika Monitor'}</span><span>用 ♥ 构建</span></div>
                                        </div>
                                    </div>
                                );
                            }}
                        </Form.Item>
                    </Card>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
                                保存配置
                            </Button>
                            <Button onClick={handleReset}>
                                恢复默认
                            </Button>
                        </Space>
                    </Form.Item>
                </Space>
            </Form>
        </div>
    );
};

export default SystemConfigComponent;
