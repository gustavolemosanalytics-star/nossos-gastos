'use client';

import { useState } from 'react';
import { useSalaries } from '@/context/SalaryContext';
import { persons } from '@/data/categories';
import type { PersonType } from '@/types';

export default function Salarios() {
  const { salaries, addSalary, updateSalary, deleteSalary } = useSalaries();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [person, setPerson] = useState<'amanda' | 'gustavo'>('gustavo');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('5');

  const resetForm = () => {
    setPerson('gustavo');
    setDescription('');
    setAmount('');
    setDueDay('5');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    if (editingId) {
      await updateSalary(editingId, {
        person,
        description,
        amount: parseFloat(amount),
        dueDay: parseInt(dueDay),
      });
      setEditingId(null);
    } else {
      await addSalary({
        person,
        description,
        amount: parseFloat(amount),
        dueDay: parseInt(dueDay),
        isActive: true,
      });
    }

    resetForm();
    setShowForm(false);
  };

  const handleEdit = (id: string) => {
    const salary = salaries.find(s => s.id === id);
    if (!salary) return;

    setPerson(salary.person);
    setDescription(salary.description);
    setAmount(salary.amount.toString());
    setDueDay(salary.dueDay.toString());
    setEditingId(id);
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await updateSalary(id, { isActive: !currentStatus });
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getPersonById = (id: PersonType) => persons.find(p => p.id === id);

  const totalActive = salaries
    .filter(s => s.isActive)
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="flex-1 pb-20">
      <div className="bg-green-600 text-white px-4 py-6">
        <h1 className="text-xl font-bold mb-2">Salários</h1>
        <p className="text-green-100 text-sm mb-4">
          Gerencie os salários que entram todo mês
        </p>
        <div className="bg-white/20 rounded-xl p-4">
          <p className="text-sm text-green-100">Total mensal esperado</p>
          <p className="text-3xl font-bold">{formatCurrency(totalActive)}</p>
        </div>
      </div>

      <div className="p-4">
        {/* Botão adicionar */}
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-medium mb-4"
        >
          + Adicionar Salário
        </button>

        {/* Lista de salários */}
        {salaries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl mb-2 block">💰</span>
            <p>Nenhum salário cadastrado</p>
            <p className="text-sm mt-1">
              Adicione os salários que entram todo mês
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {salaries.map(salary => {
              const personData = getPersonById(salary.person);

              return (
                <div
                  key={salary.id}
                  className={`bg-white rounded-xl p-4 border ${
                    salary.isActive ? 'border-green-200' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                        style={{ backgroundColor: personData?.color + '20' }}
                      >
                        {personData?.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {salary.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {personData?.name} • Até dia {salary.dueDay}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-green-600 text-lg">
                      {formatCurrency(salary.amount)}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => handleToggleActive(salary.id, salary.isActive)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        salary.isActive
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {salary.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleEdit(salary.id)}
                      className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteSalary(salary.id)}
                      className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? 'Editar Salário' : 'Novo Salário'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="p-2 text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quem recebe?
                </label>
                <div className="flex gap-2">
                  {persons
                    .filter(p => p.id !== 'nos')
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPerson(p.id as 'amanda' | 'gustavo')}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          person === p.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span className="text-xl">{p.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{p.name}</span>
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Salário Empresa X"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-xl font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dia limite para receber
                </label>
                <select
                  value={dueDay}
                  onChange={e => setDueDay(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>
                      Dia {day}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  O salário deve entrar até este dia de cada mês
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                {editingId ? 'Salvar Alterações' : 'Adicionar Salário'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
