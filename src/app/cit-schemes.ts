import {
  CIT_FORMATTER_ROMAN_UPPER,
  CitScheme,
} from '@myrmidon/cadmus-refs-citation';

export const OD_SCHEME: CitScheme = {
  id: 'od',
  name: 'Odyssey',
  path: ['book', 'verse'],
  optionalFrom: 'verse',
  textOptions: {
    pathPattern: '^\\s*([αβγδεζηθικλμνξοπρστυφχψω])\\s+(\\d+(?:[a-z])?)\\s*$',
    template: '{book} {verse}',
    hint: 'book (α-ω) verse (1-N[a-z])',
  },
  color: '#4287f5',
  steps: {
    book: {
      type: 'numeric',
      color: '#4287f5',
      format: 'agl',
      domain: {
        range: {
          min: 1,
          max: 24,
        },
      },
    },
    verse: {
      type: 'numeric',
      color: '#1ECBE1',
      suffixPattern: '([a-z])$',
      suffixValidPattern: '^[a-z]$',
      domain: {
        range: {
          min: 1,
        },
      },
    },
  },
};

export const DC_SCHEME: CitScheme = {
  id: 'dc',
  name: 'Commedia',
  path: ['cantica', 'canto', 'verso'],
  optionalFrom: 'canto',
  textOptions: {
    pathPattern: '^\\s*(If\\.|Purg\\.|Par\\.)\\s*([IVX]+)\\s+(\\d+)\\s*$',
    template: '{cantica} {canto} {verso}',
    hint: 'cantica (If., Purg., Par.) canto (1-33) verso (1-N)',
  },
  color: '#BB4142',
  steps: {
    cantica: {
      type: 'set',
      color: '#BB4142',
      domain: {
        set: ['If.', 'Purg.', 'Par.'],
      },
    },
    canto: {
      type: 'numeric',
      color: '#7EC8B1',
      format: CIT_FORMATTER_ROMAN_UPPER,
      conditions: [
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 34,
            },
          },
        },
      ],
      domain: {
        range: {
          min: 1,
          max: 33,
        },
      },
    },
    verso: {
      type: 'numeric',
      color: '#EFE6CC',
      conditions: [
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '1',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '2',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '3',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '4',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 151,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '5',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '6',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 115,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '7',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 130,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '8',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 130,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '9',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 133,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '10',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '11',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 115,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '12',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '13',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 151,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '14',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '15',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 124,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '16',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '17',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '18',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '19',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 133,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '20',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 130,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '21',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '22',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 151,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '23',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '24',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 151,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '25',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 151,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '26',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '27',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '28',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '29',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '30',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '31',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '32',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '33',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 157,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '34',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '1',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '2',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 133,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '3',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '4',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '5',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '6',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 151,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '7',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '8',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '9',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '10',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '11',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '12',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '13',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 154,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '14',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 151,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '15',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '16',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '17',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '18',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '19',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '20',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 151,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '21',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '22',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 154,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '23',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 133,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '24',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 154,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '25',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '26',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '27',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '28',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '29',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 154,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '30',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '31',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '32',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 160,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Purg.',
            },
            {
              id: 'canto',
              op: '==',
              value: '33',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '1',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '2',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '3',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 130,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '4',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '5',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '6',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '7',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '8',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '9',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '10',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '11',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '12',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '13',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '14',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '15',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '16',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 154,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '17',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '18',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 136,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '19',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '20',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '21',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '22',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 154,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '23',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '24',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 154,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '25',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '26',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '27',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '28',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 139,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '29',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '30',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 148,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '31',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '32',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 151,
            },
          },
        },
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'Par.',
            },
            {
              id: 'canto',
              op: '==',
              value: '33',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 145,
            },
          },
        },
      ],
      domain: {
        range: {
          min: 1,
        },
      },
    },
  },
};
