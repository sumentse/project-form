import moment from 'moment';
import { ExportToCsv } from 'export-to-csv';

// @ngInject
export default () => {
    return {      
        $get: /*@ngInject*/ () => {
            return {
                export: (data = [], filename = '')=>{

                    if(data.length === 0){
                        return;
                    }

                    const options = {
                        filename: filename ? filename : `data_${data.length}_${moment().format('MMDDYYYY')}`,
                        fieldSeparator: ',',
                        quoteStrings: '"',
                        decimalseparator: '.',
                        showLabels: false,
                        showTitle: false,
                        title: '',
                        useBom: true,
                        useKeysAsHeaders: true,
                        // headers: ['Column 1', 'Column 2', etc...] <-- Won't work with useKeysAsHeaders present!
                    };
                    const exportToCsv = new ExportToCsv(options);
                    exportToCsv.generateCsv( data );
            
 
                }
            }

        }
    }
};
