import {useEffect} from 'react';
import {Alert, App, Button, Card, Form, Input, Space, Spin, Switch} from 'antd';
import {Compass, ExternalLink} from 'lucide-react';
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
                                <Alert
                                    type="info"
                                    showIcon
                                    message="表格格式"
                                    description="首行固定为 category、name、url、desc。每一行代表一个站点；category 相同的链接会在导航页归为一组。"
                                />
                            </>
                        )}
                    </Form.Item>

                    <Form.Item className="mb-0 mt-6">
                        <Space>
                            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>保存配置</Button>
                            <Button href="/navigation" target="_blank">查看导航页</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default NavigationSettings;
