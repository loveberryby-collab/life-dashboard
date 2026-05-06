'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NutritionTab from './nutrition-tab'
import WeightTab from './weight-tab'
import MeasurementsTab from './measurements-tab'
import WorkoutsTab from './workouts-tab'

export default function BodyPage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Красивое тело</h1>
      <Tabs defaultValue="nutrition">
        <TabsList className="grid grid-cols-4 mb-4 rounded-md glass border-white/[0.1]">
          <TabsTrigger value="nutrition" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Питание</TabsTrigger>
          <TabsTrigger value="weight" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Вес</TabsTrigger>
          <TabsTrigger value="measurements" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Замеры</TabsTrigger>
          <TabsTrigger value="workouts" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Тренировки</TabsTrigger>
        </TabsList>
        <TabsContent value="nutrition"><NutritionTab /></TabsContent>
        <TabsContent value="weight"><WeightTab /></TabsContent>
        <TabsContent value="measurements"><MeasurementsTab /></TabsContent>
        <TabsContent value="workouts"><WorkoutsTab /></TabsContent>
      </Tabs>
    </div>
  )
}
