import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  ThesaurusEntriesPickerComponent,
} from '@myrmidon/cadmus-thesaurus-store';

const ALPHABET_ENTRIES: ThesaurusEntry[] = [
  { id: 'a', value: 'alpha' },
  { id: 'b', value: 'beta' },
  { id: 'g', value: 'gamma' },
  { id: 'd', value: 'delta' },
  { id: 'e', value: 'epsilon' },
  { id: 'z', value: 'zeta' },
  { id: 'h', value: 'eta' },
  { id: 'q', value: 'theta' },
  { id: 'i', value: 'iota' },
  { id: 'k', value: 'kappa' },
  { id: 'l', value: 'lambda' },
  { id: 'm', value: 'my' },
  { id: 'n', value: 'ny' },
  { id: 'j', value: 'ksi' },
  { id: 'o', value: 'omicron' },
  { id: 'p', value: 'pi' },
  { id: 'r', value: 'rho' },
  { id: 's', value: 'sigma' },
  { id: 't', value: 'tau' },
  { id: 'u', value: 'upsilon' },
  { id: 'f', value: 'phi' },
  { id: 'x', value: 'chi' },
  { id: 'y', value: 'psi' },
  { id: 'w', value: 'omega' },
];

const ANIMAL_ENTRIES: ThesaurusEntry[] = [
  // - y=1 x=1
  { id: 'animal', value: 'animals' },
  // -- y=2 x=1
  { id: 'animal.mammal', value: 'animal: mammals' },
  // --- y=3 x=1-26
  { id: 'animal.mammal.dog', value: 'animal: mammals: dogs' },
  { id: 'animal.mammal.cat', value: 'animal: mammals: cats' },
  { id: 'animal.mammal.mouse', value: 'animal: mammals: mice' },
  { id: 'animal.mammal.elephant', value: 'animal: mammals: elephants' },
  { id: 'animal.mammal.lion', value: 'animal: mammals: lions' },
  { id: 'animal.mammal.tiger', value: 'animal: mammals: tigers' },
  { id: 'animal.mammal.bear', value: 'animal: mammals: bears' },
  { id: 'animal.mammal.wolf', value: 'animal: mammals: wolves' },
  { id: 'animal.mammal.fox', value: 'animal: mammals: foxes' },
  { id: 'animal.mammal.deer', value: 'animal: mammals: deer' },
  { id: 'animal.mammal.rabbit', value: 'animal: mammals: rabbits' },
  { id: 'animal.mammal.horse', value: 'animal: mammals: horses' },
  { id: 'animal.mammal.cow', value: 'animal: mammals: cows' },
  { id: 'animal.mammal.goat', value: 'animal: mammals: goats' },
  { id: 'animal.mammal.sheep', value: 'animal: mammals: sheep' },
  { id: 'animal.mammal.pig', value: 'animal: mammals: pigs' },
  { id: 'animal.mammal.zebra', value: 'animal: mammals: zebras' },
  { id: 'animal.mammal.giraffe', value: 'animal: mammals: giraffes' },
  { id: 'animal.mammal.kangaroo', value: 'animal: mammals: kangaroos' },
  { id: 'animal.mammal.monkey', value: 'animal: mammals: monkeys' },
  { id: 'animal.mammal.chimpanzee', value: 'animal: mammals: chimpanzees' },
  { id: 'animal.mammal.whale', value: 'animal: mammals: whales' },
  { id: 'animal.mammal.dolphin', value: 'animal: mammals: dolphins' },
  { id: 'animal.mammal.bat', value: 'animal: mammals: bats' },
  { id: 'animal.mammal.hedgehog', value: 'animal: mammals: hedgehogs' },
  { id: 'animal.mammal.squirrel', value: 'animal: mammals: squirrels' },
  // -- y=2 x=2
  { id: 'animal.bird', value: 'animal: birds' },
  // --- y=3 x=1-12
  { id: 'animal.bird.eagle', value: 'animal: birds: eagles' },
  { id: 'animal.bird.sparrow', value: 'animal: birds: sparrows' },
  { id: 'animal.bird.pigeon', value: 'animal: birds: pigeons' },
  { id: 'animal.bird.owl', value: 'animal: birds: owls' },
  { id: 'animal.bird.hawk', value: 'animal: birds: hawks' },
  { id: 'animal.bird.parrot', value: 'animal: birds: parrots' },
  { id: 'animal.bird.crow', value: 'animal: birds: crows' },
  { id: 'animal.bird.flamingo', value: 'animal: birds: flamingos' },
  { id: 'animal.bird.pelican', value: 'animal: birds: pelicans' },
  { id: 'animal.bird.penguin', value: 'animal: birds: penguins' },
  { id: 'animal.bird.swan', value: 'animal: birds: swans' },
  { id: 'animal.bird.goose', value: 'animal: birds: geese' },
  // - y=1 x=2
  { id: 'plant', value: 'plants' },
  // -- y=2 x=1-25
  { id: 'plant.tree', value: 'plant: trees' },
  { id: 'plant.flower', value: 'plant: flowers' },
  { id: 'plant.shrub', value: 'plant: shrubs' },
  { id: 'plant.grass', value: 'plant: grasses' },
  { id: 'plant.fern', value: 'plant: ferns' },
  { id: 'plant.cactus', value: 'plant: cacti' },
  { id: 'plant.bamboo', value: 'plant: bamboos' },
  { id: 'plant.moss', value: 'plant: mosses' },
  { id: 'plant.palm', value: 'plant: palms' },
  { id: 'plant.vine', value: 'plant: vines' },
  { id: 'plant.herb', value: 'plant: herbs' },
  { id: 'plant.algae', value: 'plant: algae' },
  { id: 'plant.bulb', value: 'plant: bulbs' },
  { id: 'plant.succulent', value: 'plant: succulents' },
  { id: 'plant.conifer', value: 'plant: conifers' },
  { id: 'plant.lichen', value: 'plant: lichens' },
  { id: 'plant.reed', value: 'plant: reeds' },
  { id: 'plant.clover', value: 'plant: clovers' },
  { id: 'plant.bryophyte', value: 'plant: bryophytes' },
  { id: 'plant.corn', value: 'plant: corn' },
  { id: 'plant.wheat', value: 'plant: wheat' },
  { id: 'plant.rice', value: 'plant: rice' },
  { id: 'plant.oak', value: 'plant: oaks' },
  { id: 'plant.pine', value: 'plant: pines' },
  { id: 'plant.maple', value: 'plant: maples' },
  // - y=1 x=3
  { id: 'mineral', value: 'minerals' },
];

@Component({
  selector: 'app-thes-entries-picker-demo-page',
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCheckbox,
    MatFormField,
    MatInput,
    MatLabel,
    JsonPipe,
    ThesaurusEntriesPickerComponent,
  ],
  templateUrl: './thes-entries-picker-demo-page.component.html',
  styleUrl: './thes-entries-picker-demo-page.component.scss',
})
export class ThesEntriesPickerDemoPageComponent {
  public readonly availableEntries = signal<ThesaurusEntry[]>(ANIMAL_ENTRIES);
  public readonly hierarchicLabels = signal<boolean>(true);
  public readonly entries = signal<ThesaurusEntry[]>([ANIMAL_ENTRIES[2]]); // dog

  public readonly hierarchical: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });
  public readonly custom: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });
  public readonly autoSort: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });
  public readonly min: FormControl<number> = new FormControl(0, {
    nonNullable: true,
  });
  public readonly max: FormControl<number> = new FormControl(0, {
    nonNullable: true,
  });

  constructor() {
    // when hierarchical changes, change available entries
    this.hierarchical.valueChanges.subscribe((value) => {
      this.hierarchicLabels.set(value);
      this.availableEntries.set(value ? ANIMAL_ENTRIES : ALPHABET_ENTRIES);
    });
  }

  public onEntriesChange(entries: ThesaurusEntry[]): void {
    console.log('entries changed: ', entries);
    this.entries.set(entries);
  }
}
