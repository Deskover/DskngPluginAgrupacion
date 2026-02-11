import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';
import { ConfigJsonEditor } from './components/ConfigJsonEditor';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel).setPanelOptions((builder) => {
  return builder
    .addCustomEditor({
      id: 'configJson',
      path: 'configJson',
      name: 'Panel JSON',
      description: 'Configuracion JSON del panel (categorias, secciones, graficas, endpoints y codigo).',
      editor: ConfigJsonEditor,
      defaultValue: '',
    });
});
