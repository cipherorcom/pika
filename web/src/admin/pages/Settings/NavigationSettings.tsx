import {useEffect} from 'react';
import {App, Button, Card, Form, Input, Space, Spin, Switch} from 'antd';
import {Compass, ExternalLink, TableProperties} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {getSystemConfig, saveSystemConfig} from '@/api/property.ts';
import {getErrorMessage} from '@/lib/utils.ts';

const NavigationSettings = () => {
    const [form] = Form.useForm();
    const {message: messageApi} = App.useApp();
    const queryClient = useQueryClient();
    const {data: config, isLoading} = useQuery({
        queryKey: ['systemConfig'],
        queryFn: getSystemConfig,
    });

    const saveMutation = useMutation({
        mutationFn: saveSystemConfig,
        onSuccess: () => {
            messageApi.success('导航站配置已保存');
            queryClient.invalidateQueries({queryKey: ['systemConfig']});
            window.location.reload();
        },
        onError: (error: unknown) => messageApi.error(getErrorMessage(error, '保存失败')),
    });

    useEffect(() => {
        if (config) {
            form.setFieldsValue({
                navigationEnabled: config.navigationEnabled ?? false,
				navigationAnonymousAccess: config.navigationAnonymousAccess ?? true,
                navigationSheetUrl: config.navigationSheetUrl ?? '',
            });
        }
    }, [config, form]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (!config) return;
            saveMutation.mutate({
                ...config,
                navigationEnabled: values.navigationEnabled ?? false,
				navigationAnonymousAccess: values.navigationAnonymousAccess ?? true,
                navigationSheetUrl: values.navigationSheetUrl || '',
            });
        } catch {
            // 表单校验失败时不保存。
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center py-20"><Spin/></div>;
    }

    return (
        <div>
            <div className="mb-4">
                <h2 className="text-xl font-bold">导航站配置</h2>
                <p className="mt-2 text-gray-500">使用公开 Google 表格维护站点分类和链接，更新表格后会自动同步到公共导航页。</p>
            </div>

            <Card type="inner" className="mb-4" title={<span className="flex items-center gap-2"><Compass size={17}/>公共导航站</span>}>
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        label="启用公共导航站"
                        name="navigationEnabled"
                        valuePropName="checked"
                        extra="启用后，公共页面顶部会出现“导航站”标签。"
                    >
                        <Switch checkedChildren="启用" unCheckedChildren="关闭"/>
                    </Form.Item>

					<Form.Item
						label="允许匿名访问"
						name="navigationAnonymousAccess"
						valuePropName="checked"
						extra="关闭后，导航内容只会提供给已登录用户；未登录请求会被服务端拒绝。"
					>
						<Switch checkedChildren="允许" unCheckedChildren="需登录"/>
					</Form.Item>

                    <Form.Item noStyle shouldUpdate={(previous, current) => previous.navigationEnabled !== current.navigationEnabled}>
                        {({getFieldValue}) => getFieldValue('navigationEnabled') && (
                            <>
                                <Form.Item
                                    label="Google 表格地址"
                                    name="navigationSheetUrl"
                                    rules={[
                                        {required: true, message: '请输入 Google 表格地址'},
                                        {type: 'url', message: '请输入有效的 HTTPS 地址'},
                                        {
                                            validator: (_, value: string) => {
                                                try {
                                                    const url = new URL(value);
                                                    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || !url.pathname.startsWith('/spreadsheets/d/')) {
                                                        return Promise.reject(new Error('请填写 docs.google.com 的 Google 表格链接'));
                                                    }
                                                    return Promise.resolve();
                                                } catch {
                                                    return Promise.reject(new Error('请输入有效的 Google 表格地址'));
                                                }
                                            },
                                        },
                                    ]}
                                    tooltip="表格需设置为“知道链接的任何人可查看”。系统默认读取首个工作表，也支持 URL 中的 gid。"
                                >
                                    <Input prefix={<ExternalLink size={15} className="text-slate-400"/>} placeholder="https://docs.google.com/spreadsheets/d/表格ID/edit#gid=0"/>
                                </Form.Item>
                                <section className="rounded-xl border border-blue-200/80 bg-blue-50/70 p-4 dark:border-cyan-300/15 dark:bg-slate-950/45">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-300">
                                            <TableProperties size={17}/>
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <h3 className="m-0 text-sm font-semibold text-slate-800 dark:text-slate-100">数据表格式</h3>
                                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-200">首行为字段名</span>
                                            </div>
                                            <p className="mb-0 mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">每一行对应一个站点；相同分类会在导航页自动归为一组。</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {[
                                            ['category', '分类名称'],
                                            ['name', '站点名称'],
                                            ['url', '站点地址'],
                                            ['desc', '简短说明'],
                                        ].map(([field, label]) => (
                                            <div key={field} className="rounded-lg border border-blue-200/70 bg-white/75 px-3 py-2 dark:border-white/10 dark:bg-slate-900/65">
                                                <code className="block text-xs font-semibold text-blue-700 dark:text-cyan-300">{field}</code>
                                                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}
                    </Form.Item>

                    <Form.Item className="mb-0 mt-5 border-t border-slate-200 pt-5 dark:border-slate-700/80">
                        <Space wrap size={10}>
                            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>保存配置</Button>
                            <Button href="/navigation" target="_blank" icon={<ExternalLink size={15}/>}>查看导航页</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default NavigationSettings;
